import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { acceptTripInvite, loadSharedTrip, saveSharedTrip, TripVersionConflictError } from "../api";
import { normalizeTripCategory, type ExpenseItem, type ItineraryItem, type LedgerItem, type StoredTrip, type TripDetails } from "../model";
import { saveTrip, saveTripDetails } from "../storage";
import { normalizeTripExpense } from "../expense";
import { sortItineraryItems } from "../utils";
import { writeHistoryIfChanged } from "../../navigation/history";

type TripState = {
  totalBudget: number | null;
  expenses: LedgerItem[];
  budgetItems: ExpenseItem[];
  plans: ItineraryItem[];
  details: TripDetails;
};

export type TripSyncConflict = { localSnapshot: TripState; remoteSnapshot: TripState; remoteVersion: number | undefined };
type RemoteBaseline = { tripId: string; accessToken: string; version: number | undefined; fingerprint: string };

type TripSetters = {
  setTotalBudget: Dispatch<SetStateAction<number | null>>;
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
  snapshotTripId: string | null;
  onRemoteTripLoaded: (tripId: string) => void;
  storageScope: string;
  tripId: string;
};

/** Keeps browser persistence and the authenticated Supabase snapshot behind one boundary. */
export function useTripPersistence({
  accessToken,
  authReady,
  budgetItems,
  totalBudget,
  details,
  enabled,
  expenses,
  plans,
  persistLocal,
  snapshotTripId,
  onRemoteTripLoaded,
  setBudgetItems,
  setTotalBudget,
  setDetails,
  setExpenses,
  setPlans,
  storageScope,
  tripId,
}: Options) {
  const [remoteBaseline, setRemoteBaseline] = useState<RemoteBaseline | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncRetrying, setSyncRetrying] = useState(false);
  const [conflict, setConflict] = useState<TripSyncConflict | null>(null);
  const [resolvingConflict, setResolvingConflict] = useState(false);
  const deletingRef = useRef(false);
  const saveAbortRef = useRef<AbortController | null>(null);
  const conflictPendingRef = useRef(false);
  const failedSyncRef = useRef<{ snapshot: TripState; version: number | undefined } | null>(null);
  const detailsRef = useRef(details);
  const snapshot = useMemo(() => ({ totalBudget, expenses, budgetItems, plans, details }), [budgetItems, details, expenses, plans, totalBudget]);
  const ownsSnapshot = snapshotTripId === tripId;
  const normalizeSnapshot = useCallback((trip: StoredTrip, fallbackDetails: TripDetails): TripState => ({
    totalBudget: typeof trip.totalBudget === "number" && Number.isFinite(trip.totalBudget) && trip.totalBudget >= 0 ? trip.totalBudget : null,
    expenses: trip.expenses.map((item) => normalizeTripExpense(item as unknown as Record<string, unknown>, "actual")).filter((item): item is LedgerItem => item !== null),
    budgetItems: trip.budgetItems.map((item) => normalizeTripExpense(item as unknown as Record<string, unknown>, "estimated")).filter((item): item is ExpenseItem => item !== null),
    plans: sortItineraryItems(trip.plans.flatMap((item) => {
      const type = normalizeTripCategory(item.type);
      return type ? [{ ...item, type }] : [];
    })),
    details: trip.details || fallbackDetails,
  }), []);
  const applySnapshot = useCallback((next: TripState) => {
    setTotalBudget(next.totalBudget);
    setExpenses(next.expenses);
    setBudgetItems(next.budgetItems);
    setPlans(next.plans);
    setDetails(next.details);
  }, [setBudgetItems, setDetails, setExpenses, setPlans, setTotalBudget]);

  useEffect(() => {
    detailsRef.current = details;
  }, [details]);

  useEffect(() => {
    const onDelete = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== tripId) return;
      deletingRef.current = true;
      saveAbortRef.current?.abort();
      setRemoteBaseline(null);
    };
    const onDeleteCancelled = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== tripId) return;
      deletingRef.current = false;
      setRemoteBaseline(null);
    };
    window.addEventListener("tuyu-tripdelete", onDelete);
    window.addEventListener("tuyu-tripdeletecancel", onDeleteCancelled);
    return () => {
      window.removeEventListener("tuyu-tripdelete", onDelete);
      window.removeEventListener("tuyu-tripdeletecancel", onDeleteCancelled);
    };
  }, [accessToken, tripId]);

  useEffect(() => {
    if (!enabled || !persistLocal || !ownsSnapshot) return;
    saveTrip({ totalBudget, expenses, budgetItems, plans }, tripId, storageScope);
  }, [budgetItems, enabled, expenses, ownsSnapshot, persistLocal, plans, storageScope, totalBudget, tripId]);

  useEffect(() => {
    if (enabled && persistLocal && ownsSnapshot) saveTripDetails(details, tripId, storageScope);
  }, [details, enabled, ownsSnapshot, persistLocal, storageScope, tripId]);

  useEffect(() => {
    if (!enabled || !authReady || !accessToken) return;
    let cancelled = false;
    conflictPendingRef.current = false;
    setRemoteBaseline(null);
    setConflict(null);
    setResolvingConflict(false);

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
          const remoteSnapshot = normalizeSnapshot(trip, detailsRef.current);
          // Cache the verified remote payload under the request's own id before
          // publishing it to shared React state. This is never inferred from a
          // later effect observing a changed tripId.
          try {
            saveTrip({ totalBudget: remoteSnapshot.totalBudget, expenses: remoteSnapshot.expenses, budgetItems: remoteSnapshot.budgetItems, plans: remoteSnapshot.plans }, tripId, storageScope);
            saveTripDetails(remoteSnapshot.details, tripId, storageScope);
          } catch {
            // Remote data is still valid to display; the next visit simply
            // remains cloud-only if browser storage is unavailable.
          }
          applySnapshot(remoteSnapshot);
          onRemoteTripLoaded(tripId);
          window.dispatchEvent(new CustomEvent("tuyu-tripremote", { detail: tripId }));
          const fingerprint = JSON.stringify(remoteSnapshot);
          setRemoteBaseline({ tripId, accessToken, version: loadedVersion, fingerprint });
        }
        setSyncError(null);
      })
      .catch(() => {
        if (!cancelled) {
          // A failed remote read has no confirmed baseline. In particular, do
          // not retain the previous trip's in-memory snapshot as a retryable
          // write for this trip.
          failedSyncRef.current = null;
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
    const fingerprint = JSON.stringify(conflict.remoteSnapshot);
    if (accessToken) setRemoteBaseline({ tripId, accessToken, version: conflict.remoteVersion, fingerprint });
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
      setRemoteBaseline({ tripId, accessToken, version: result.version, fingerprint: JSON.stringify(localSnapshot) });
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
      setRemoteBaseline({ tripId, accessToken, version: result.version, fingerprint: JSON.stringify(failed.snapshot) });
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
    if (!enabled || !persistLocal || !ownsSnapshot || !accessToken || !remoteBaseline || remoteBaseline.tripId !== tripId || remoteBaseline.accessToken !== accessToken || conflict || resolvingConflict || conflictPendingRef.current) return;
    const fingerprint = JSON.stringify(snapshot);
    if (fingerprint === remoteBaseline.fingerprint) return;
    const timer = window.setTimeout(() => {
      if (deletingRef.current) return;
      const controller = new AbortController();
      saveAbortRef.current = controller;
      void saveSharedTrip(tripId, snapshot, remoteBaseline.version, accessToken, controller.signal)
        .then((result) => { if (!deletingRef.current) { setRemoteBaseline({ tripId, accessToken, version: result.version, fingerprint }); setSyncError(null); } })
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
          failedSyncRef.current = { snapshot, version: remoteBaseline.version };
          setSyncError("云端同步失败，本地修改已保留。");
        })
        .finally(() => { if (saveAbortRef.current === controller) saveAbortRef.current = null; });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [accessToken, conflict, details, enabled, normalizeSnapshot, ownsSnapshot, persistLocal, remoteBaseline, resolvingConflict, snapshot, storageScope, tripId]);

  return { conflict, disableRemoteSync: () => setRemoteBaseline(null), resolvingConflict, retryLocalSnapshot, retrySync, syncError, syncRetrying, useRemoteSnapshot };
}
