import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { loadSharedTrip, saveSharedTrip } from "../api";
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

    void loadSharedTrip(tripId, accessToken)
      .then((trip) => {
        if (cancelled) return;
        if (trip) {
          setExpenses(trip.expenses);
          setBudgetItems(trip.budgetItems);
          setPlans(sortItineraryItems(trip.plans));
          if (trip.details) setDetails(trip.details);
        }
        setSyncedAccessToken(accessToken);
      })
      .catch(() => {
        // Local storage remains available when cloud sync is unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, authReady, enabled, setBudgetItems, setDetails, setExpenses, setPlans, tripId]);

  useEffect(() => {
    if (!accessToken || syncedAccessToken !== accessToken) return;
    const timer = window.setTimeout(() => {
      void saveSharedTrip(tripId, { expenses, budgetItems, plans, details }, accessToken);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [accessToken, budgetItems, details, expenses, plans, syncedAccessToken, tripId]);

  return { disableRemoteSync: () => setSyncedAccessToken(null) };
}
