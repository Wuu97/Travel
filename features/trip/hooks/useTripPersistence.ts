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
  enabled: boolean;
  tripId: string;
};

/** Keeps browser persistence and the optional D1 snapshot behind one boundary. */
export function useTripPersistence({
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
  const [remoteSyncEnabled, setRemoteSyncEnabled] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    saveTrip({ expenses, budgetItems, plans });
  }, [budgetItems, enabled, expenses, plans]);

  useEffect(() => {
    if (enabled) saveTripDetails(details);
  }, [details, enabled]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    void loadSharedTrip(tripId)
      .then((trip) => {
        if (cancelled) return;
        if (trip) {
          setExpenses(trip.expenses);
          setBudgetItems(trip.budgetItems);
          setPlans(sortItineraryItems(trip.plans));
          if (trip.details) setDetails(trip.details);
        }
        setRemoteSyncEnabled(true);
      })
      .catch(() => {
        // Local storage remains available when D1 is not configured.
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, setBudgetItems, setDetails, setExpenses, setPlans, tripId]);

  useEffect(() => {
    if (!remoteSyncEnabled) return;
    const timer = window.setTimeout(() => {
      void saveSharedTrip(tripId, { expenses, budgetItems, plans, details });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [budgetItems, details, expenses, plans, remoteSyncEnabled, tripId]);

  return { disableRemoteSync: () => setRemoteSyncEnabled(false) };
}
