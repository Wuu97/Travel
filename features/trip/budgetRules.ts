import type { ExpenseItem, LedgerItem } from "./model";

/** Derives budget-facing totals from persisted trip data, never presentation constants. */
export function getBudgetOverview(budgetItems: ExpenseItem[], expenses: LedgerItem[]) {
  const plannedTotal = budgetItems.reduce((sum, item) => sum + item.amount, 0);
  const actualTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  return { actualTotal, plannedTotal, remaining: plannedTotal - actualTotal };
}
