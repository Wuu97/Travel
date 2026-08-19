import type { ExpenseItem, LedgerItem, TripExpense } from "./model";

export function toLedgerItem(expense: TripExpense, payer = "你"): LedgerItem {
  return { id: expense.id, item: expense.title, type: expense.type, amount: expense.amount, by: payer, relatedItineraryItemId: expense.relatedItineraryItemId, relatedItineraryTitle: expense.relatedItineraryTitle };
}

export function toBudgetItem(expense: TripExpense): ExpenseItem {
  return { ...expense, occurrence: "estimated" };
}

export function createTripExpense(input: Omit<TripExpense, "id"> & { id?: string }): TripExpense {
  return { ...input, id: input.id ?? `expense-${Date.now()}` };
}
