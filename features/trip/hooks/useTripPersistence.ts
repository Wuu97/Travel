import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { acceptTripInvite, loadSharedTrip, saveSharedTrip } from "../api";
import type { ExpenseItem, ItineraryItem, LedgerItem, TripDetails } from "../model";
import { saveTrip, saveTripDetails } from "../storage";
import { normalizeTripExpense } from "../expense";
import { sortItineraryItems } from "../utils";

type TripState = {
  expenses: LedgerItem[];
  budgetItems: ExpenseItem[];
  plans: ItineraryItem[];
  details: TripDetails;
};

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
  setBudgetItems,
  setDetails,
  setExpenses,
  setPlans,
  tripId,
}: Options) {
  const [syncedAccessToken, setSyncedAccessToken] = useState<string | null>(null);
  const [version, setVersion] = useState<number | undefined>();
  const [syncError, setSyncError] = useState<string | null>(null);
  const lastSavedRef = useRef("");

  useEffect(() => {
    if (!enabled) return;
    saveTrip({ expenses, budgetItems, plans }, tripId);
  }, [budgetItems, enabled, expenses, plans, tripId]);

  useEffect(() => {
    if (enabled) saveTripDetails(details, tripId);
  }, [details, enabled, tripId]);

  useEffect(() => {
    if (!syncError) return;
    const timer = window.setTimeout(() => setSyncError(null), 8_000);
    return () => window.clearTimeout(timer);
  }, [syncError]);

  useEffect(() => {
    if (!enabled || !authReady || !accessToken) return;
    let cancelled = false;

    const loadCurrentTrip = async () => {
      const invite = new URLSearchParams(window.location.search).get("invite");
      if (!invite) return { redirected: false as const, result: await loadSharedTrip(tripId, accessToken) };

      const acceptedTripId = await acceptTripInvite(invite, accessToken);
      const url = new URL(window.location.href);
      url.searchParams.set("trip", acceptedTripId);
      url.searchParams.delete("invite");
      window.history.replaceState(null, "", url);
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
          // Shared snapshots may predate the unified model; normalize at the boundary.
          setExpenses(trip.expenses.map((item) => normalizeTripExpense(item as unknown as Record<string, unknown>, "actual")).filter((item): item is LedgerItem => item !== null));
          setBudgetItems(trip.budgetItems.map((item) => normalizeTripExpense(item as unknown as Record<string, unknown>, "estimated")).filter((item): item is ExpenseItem => item !== null));
          setPlans(sortItineraryItems(trip.plans));
          if (trip.details) setDetails(trip.details);
        }
        lastSavedRef.current = trip ? JSON.stringify(trip) : "";
        setVersion(loadedVersion);
        setSyncError(null);
        setSyncedAccessToken(accessToken);
      })
      .catch((error) => {
        if (!cancelled) setSyncError(error instanceof Error ? error.message : "云端同步不可用，已保留本地副本。");
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, authReady, enabled, setBudgetItems, setDetails, setExpenses, setPlans, tripId]);

  useEffect(() => {
    if (!accessToken || syncedAccessToken !== accessToken) return;
    const snapshot = { expenses, budgetItems, plans, details };
    const fingerprint = JSON.stringify(snapshot);
    if (fingerprint === lastSavedRef.current) return;
    const timer = window.setTimeout(() => {
      void saveSharedTrip(tripId, snapshot, version, accessToken)
        .then((result) => { lastSavedRef.current = fingerprint; setVersion(result.version); setSyncError(null); })
        .catch((error) => setSyncError(error instanceof Error ? error.message : "保存失败，请稍后重试。"));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [accessToken, budgetItems, details, expenses, plans, syncedAccessToken, tripId, version]);

  return { disableRemoteSync: () => setSyncedAccessToken(null), syncError };
}
