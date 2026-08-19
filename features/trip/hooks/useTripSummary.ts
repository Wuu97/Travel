import type { LedgerItem, TripDetails } from "../model";
import { getTripDays } from "../utils";

/** Computes shared trip summary values consumed by schedule and budget views. */
export function useTripSummary(details: TripDetails, expenses: LedgerItem[]) {
  const days = getTripDays(details.startDate, details.endDate);
  const actualTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  return { actualTotal, days };
}
