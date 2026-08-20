import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { acceptTripInvite, loadSharedTrip, saveSharedTrip } from "../api";
import type { ExpenseItem, ItineraryItem, LedgerItem, TripDetails } from "../model";
import { saveTrip, saveTripDetails } from "../storage";
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
    if (!enabled || !authReady || !accessToken) return;
    let cancelled = false;

    const invite = new URLSearchParams(window.location.search).get("invite");
    const load = invite ? acceptTripInvite(invite, accessToken).then(() => loadSharedTrip(tripId, accessToken)) : loadSharedTrip(tripId, accessToken);
    void load
      .then(({ trip, version: loadedVersion }) => {
        if (cancelled) return;
        if (trip) {
          setExpenses(trip.expenses);
          setBudgetItems(trip.budgetItems);
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
