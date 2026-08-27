import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { acceptTripInvite, loadSharedTrip, saveSharedTrip, TripVersionConflictError } from "../api";
import type { ExpenseItem, ItineraryItem, LedgerItem, StoredTrip, TripDetails } from "../model";
import { saveTrip, saveTripDetails } from "../storage";
import { normalizeTripExpense } from "../expense";
import { sortItineraryItems } from "../utils";
import { writeHistoryIfChanged } from "../../navigation/history";

type TripState = {
  expenses: LedgerItem[];
  budgetItems: ExpenseItem[];
  plans: ItineraryItem[];
  details: TripDetails;
};

export type TripSyncConflict = { localSnapshot: TripState; remoteSnapshot: TripState; remoteVersion: number | undefined };

type TripSetters = {
  setExpenses: Dispatch<SetStateAction<LedgerItem[]>>;
  setBudgetItems: Dispatch<SetStateAction<ExpenseItem[]>>;
  setPlans: Dispatch<SetStateAction<ItineraryItem[]>>;
  setDetails: Dispatch<SetStateAction<TripDetails>>;
};

type Options = TripState & TripSetters & {
  accessToken: string | null;
  authReady: boolean;
  enabled: boolean;
  persistLocal: boolean;
  onRemoteTripLoaded: () => void;
  storageScope: string;
  tripId: string;
};

/** Keeps browser persistence and the authenticated Supabase snapshot behind one boundary. */
export function useTripPersistence({
  accessToken,
  authReady,
  budgetItems,
  details,
  enabled,
  expenses,
  plans,
  persistLocal,
  onRemoteTripLoaded,
  setBudgetItems,
  setDetails,
  setExpenses,
  setPlans,
  storageScope,
  tripId,
}: Options) {
  const [syncedAccessToken, setSyncedAccessToken] = useState<string | null>(null);
  const [version, setVersion] = useState<number | undefined>();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncRetrying, setSyncRetrying] = useState(false);
  const [conflict, setConflict] = useState<TripSyncConflict | null>(null);
  const [resolvingConflict, setResolvingConflict] = useState(false);
  const lastSavedRef = useRef("");
  const deletingRef = useRef(false);
  const saveAbortRef = useRef<AbortController | null>(null);
  const conflictPendingRef = useRef(false);
  const failedSyncRef = useRef<{ snapshot: TripState; version: number | undefined } | null>(null);
  const detailsRef = useRef(details);
  const snapshot = useMemo(() => ({ expenses, budgetItems, plans, details }), [budgetItems, details, expenses, plans]);
  const snapshotRef = useRef(snapshot);
  const versionRef = useRef(version);
  const normalizeSnapshot = useCallback((trip: StoredTrip, fallbackDetails: TripDetails): TripState => ({
    expenses: trip.expenses.map((item) => normalizeTripExpense(item as unknown as Record<string, unknown>, "actual")).filter((item): item is LedgerItem => item !== null),
    budgetItems: trip.budgetItems.map((item) => normalizeTripExpense(item as unknown as Record<string, unknown>, "estimated")).filter((item): item is ExpenseItem => item !== null),
    plans: sortItineraryItems(trip.plans),
    details: trip.details || fallbackDetails,
  }), []);
  const applySnapshot = useCallback((next: TripState) => {
    setExpenses(next.expenses);
    setBudgetItems(next.budgetItems);
    setPlans(next.plans);
    setDetails(next.details);
  }, [setBudgetItems, setDetails, setExpenses, setPlans]);

  useEffect(() => {
    detailsRef.current = details;
  }, [details]);

  useEffect(() => {
    snapshotRef.current = snapshot;
    versionRef.current = version;
  }, [snapshot, version]);

  useEffect(() => {
    const onDelete = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== tripId) return;
      deletingRef.current = true;
      saveAbortRef.current?.abort();
      setSyncedAccessToken(null);
    };
    const onDeleteCancelled = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== tripId) return;
      deletingRef.current = false;
      setSyncedAccessToken(accessToken);
    };
    window.addEventListener("tuyu-tripdelete", onDelete);
    window.addEventListener("tuyu-tripdeletecancel", onDeleteCancelled);
    return () => {
      window.removeEventListener("tuyu-tripdelete", onDelete);
      window.removeEventListener("tuyu-tripdeletecancel", onDeleteCancelled);
    };
  }, [accessToken, tripId]);

  useEffect(() => {
    if (!enabled || !persistLocal) return;
    saveTrip({ expenses, budgetItems, plans }, tripId, storageScope);
  }, [budgetItems, enabled, expenses, persistLocal, plans, storageScope, tripId]);

  useEffect(() => {
    if (enabled && persistLocal) saveTripDetails(details, tripId, storageScope);
  }, [details, enabled, persistLocal, storageScope, tripId]);

  useEffect(() => {
    if (!enabled || !authReady || !accessToken) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setSyncedAccessToken(null);
        conflictPendingRef.current = false;
        setConflict(null);
        setResolvingConflict(false);
      }
    });

    const loadCurrentTrip = async () => {
      const invite = new URLSearchParams(window.location.search).get("invite");
      if (!invite) return { redirected: false as const, result: await loadSharedTrip(tripId, accessToken) };

      const acceptedTripId = await acceptTripInvite(invite, accessToken);
      const url = new URL(window.location.href);
      url.searchParams.set("trip", acceptedTripId);
      url.searchParams.delete("invite");
      writeHistoryIfChanged("replace", url, "accept-invite");
      if (acceptedTripId !== tripId) {
        window.dispatchEvent(new Event("tuyu-tripchange"));
        return { redirected: true as const };
      }
      return { redirected: false as const, result: await loadSharedTrip(acceptedTripId, accessToken) };
    };

    void loadCurrentTrip()
      .then((loaded) => {
        if (cancelled) return;
        if (loaded.redirected) return;
        const { trip, version: loadedVersion } = loaded.result;
        if (trip) {
          applySnapshot(normalizeSnapshot(trip, detailsRef.current));
          onRemoteTripLoaded();
          window.dispatchEvent(new CustomEvent("tuyu-tripremote", { detail: tripId }));
        }
        lastSavedRef.current = trip ? JSON.stringify(trip) : "";
        setVersion(loadedVersion);
        setSyncError(null);
        setSyncedAccessToken(accessToken);
      })
      .catch(() => {
        if (!cancelled) {
          failedSyncRef.current = { snapshot: snapshotRef.current, version: versionRef.current };
          setSyncError("云端同步失败，本地修改已保留。");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, applySnapshot, authReady, enabled, normalizeSnapshot, onRemoteTripLoaded, storageScope, tripId]);

  const useRemoteSnapshot = () => {
    if (!conflict) return;
    applySnapshot(conflict.remoteSnapshot);
    lastSavedRef.current = JSON.stringify(conflict.remoteSnapshot);
    setVersion(conflict.remoteVersion);
    conflictPendingRef.current = false;
    setConflict(null);
    setSyncError(null);
  };

  const retryLocalSnapshot = async () => {
    if (!conflict || !accessToken || resolvingConflict) return;
    const localSnapshot = conflict.localSnapshot;
    conflictPendingRef.current = true;
    setResolvingConflict(true);
    try {
      const result = await saveSharedTrip(tripId, localSnapshot, conflict.remoteVersion, accessToken);
      lastSavedRef.current = JSON.stringify(localSnapshot);
      setVersion(result.version);
      conflictPendingRef.current = false;
      setConflict(null);
      setSyncError(null);
    } catch (error) {
      if (error instanceof TripVersionConflictError) {
        try {
          const latest = await loadSharedTrip(tripId, accessToken);
          if (!latest.trip) throw new Error("云端旅行不存在。");
          setConflict({ localSnapshot, remoteSnapshot: normalizeSnapshot(latest.trip, detailsRef.current), remoteVersion: latest.version });
        } catch (reason) {
          conflictPendingRef.current = false;
          setSyncError(reason instanceof Error ? reason.message : "保存冲突，无法读取云端最新版本。");
        }
      } else setSyncError(error instanceof Error ? error.message : "保存失败，请稍后重试。");
    } finally { setResolvingConflict(false); }
  };

  const retrySync = async () => {
    const failed = failedSyncRef.current;
    if (!failed || !accessToken || syncRetrying || conflict) return;
    setSyncRetrying(true);
    try {
      const result = await saveSharedTrip(tripId, failed.snapshot, failed.version, accessToken);
      lastSavedRef.current = JSON.stringify(failed.snapshot);
      setVersion(result.version);
      failedSyncRef.current = null;
      setSyncError(null);
    } catch (error) {
      if (error instanceof TripVersionConflictError) {
        conflictPendingRef.current = true;
        try {
          const latest = await loadSharedTrip(tripId, accessToken);
          if (!latest.trip) throw new Error("云端旅行不存在。");
          setConflict({ localSnapshot: failed.snapshot, remoteSnapshot: normalizeSnapshot(latest.trip, detailsRef.current), remoteVersion: latest.version });
          setSyncError(null);
        } catch {
          conflictPendingRef.current = false;
          setSyncError("云端同步失败，本地修改已保留。");
        }
      } else setSyncError("云端同步失败，本地修改已保留。");
    } finally { setSyncRetrying(false); }
  };

  useEffect(() => {
    if (!enabled || !persistLocal || !accessToken || syncedAccessToken !== accessToken || conflict || resolvingConflict || conflictPendingRef.current) return;
    const fingerprint = JSON.stringify(snapshot);
    if (fingerprint === lastSavedRef.current) return;
    const timer = window.setTimeout(() => {
      if (deletingRef.current) return;
      const controller = new AbortController();
      saveAbortRef.current = controller;
      void saveSharedTrip(tripId, snapshot, version, accessToken, controller.signal)
        .then((result) => { if (!deletingRef.current) { lastSavedRef.current = fingerprint; setVersion(result.version); setSyncError(null); } })
        .catch((error) => {
          if (controller.signal.aborted) return;
          if (error instanceof TripVersionConflictError) {
            conflictPendingRef.current = true;
            void loadSharedTrip(tripId, accessToken).then((latest) => {
              if (!latest.trip) throw new Error("云端旅行不存在。");
              setConflict({ localSnapshot: snapshot, remoteSnapshot: normalizeSnapshot(latest.trip, detailsRef.current), remoteVersion: latest.version });
              setSyncError(null);
            }).catch((reason) => { conflictPendingRef.current = false; setSyncError(reason instanceof Error ? reason.message : "保存冲突，无法读取云端最新版本。"); });
            return;
          }
          failedSyncRef.current = { snapshot, version };
          setSyncError("云端同步失败，本地修改已保留。");
        })
        .finally(() => { if (saveAbortRef.current === controller) saveAbortRef.current = null; });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [accessToken, conflict, details, enabled, normalizeSnapshot, persistLocal, resolvingConflict, snapshot, storageScope, syncedAccessToken, tripId, version]);

  return { conflict, disableRemoteSync: () => setSyncedAccessToken(null), resolvingConflict, retryLocalSnapshot, retrySync, syncError, syncRetrying, useRemoteSnapshot };
}
