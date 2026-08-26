import type { ExpenseItem, ItineraryItem, LedgerItem } from "./model";

export function getItineraryExpenseSummary(id: string, budgetItems: ExpenseItem[], expenses: LedgerItem[]) {
  const total = (items: Array<ExpenseItem | LedgerItem>) => items.filter((item) => item.relatedItineraryItemId === id).reduce((sum, item) => sum + item.amount, 0);
  const estimated = total(budgetItems);
  const actual = total(expenses);
  return estimated || actual ? { estimated, actual } : null;
}

export function syncExpenseRelationTitle<T extends ExpenseItem | LedgerItem>(items: T[], plan: ItineraryItem): T[] {
  return items.map((item) => item.relatedItineraryItemId === plan.id ? { ...item, relatedItineraryTitle: plan.title } : item) as T[];
}

export function clearExpenseRelation<T extends ExpenseItem | LedgerItem>(items: T[], planId: string): T[] {
  return items.map((item) => {
    if (item.relatedItineraryItemId !== planId) return item;
    const expense = { ...item };
    delete expense.relatedItineraryItemId;
    delete expense.relatedItineraryTitle;
    return expense;
  }) as T[];
}

/** Retains AI links only when the referenced itinerary ID is present in this trip. */
export function resolveExpenseRelation<T extends ExpenseItem>(expense: T, plans: ItineraryItem[]): T {
  if (!expense.relatedItineraryItemId) return expense;
  const plan = plans.find((item) => item.id === expense.relatedItineraryItemId);
  if (plan) return { ...expense, relatedItineraryTitle: plan.title };
  const unlinked = { ...expense };
  delete unlinked.relatedItineraryItemId;
  delete unlinked.relatedItineraryTitle;
  return unlinked;
}
