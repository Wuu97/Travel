import type { ExpenseItem, LedgerItem, TripExpense } from "./model";
import { createId } from "../shared/utils/createId";

/** Converts pre-5.1 LedgerItem / partial snapshots into the shared expense model. */
export function normalizeTripExpense(value: Record<string, unknown>, fallbackOccurrence: TripExpense["occurrence"]): TripExpense {
  const title = typeof value.title === "string" ? value.title : typeof value.item === "string" ? value.item : "";
  const occurrence = value.occurrence === "actual" || value.occurrence === "estimated" ? value.occurrence : fallbackOccurrence;
  return {
    id: typeof value.id === "string" && value.id ? value.id : createId("expense"),
    title: title.trim(), type: value.type as TripExpense["type"], amount: Number(value.amount), occurrence,
    ...(typeof value.relatedItineraryItemId === "string" ? { relatedItineraryItemId: value.relatedItineraryItemId } : {}),
    ...(typeof value.relatedItineraryTitle === "string" ? { relatedItineraryTitle: value.relatedItineraryTitle } : {}),
    ...(typeof value.date === "string" ? { date: value.date } : {}),
    ...(typeof value.payer === "string" ? { payer: value.payer } : typeof value.by === "string" ? { payer: value.by } : {}),
    ...(typeof value.note === "string" ? { note: value.note } : {}),
  };
}

/** @deprecated Actual expenses now use TripExpense directly. */
export function toLedgerItem(expense: TripExpense, payer = "你"): LedgerItem { return { ...expense, occurrence: "actual", payer: expense.payer ?? payer }; }

export function toBudgetItem(expense: TripExpense): ExpenseItem {
  return { ...expense, occurrence: "estimated" };
}

export function createTripExpense(input: Omit<TripExpense, "id"> & { id?: string }): TripExpense {
  return { ...input, id: input.id ?? createId("expense") };
}
