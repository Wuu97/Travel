import type { ExpenseCategory, ExpenseItem, LedgerItem } from "./model";

const expenseCategories: ExpenseCategory[] = ["住宿", "餐饮", "交通", "门票", "活动", "其他"];

export type CategoryBudgetVsActual = {
  category: ExpenseCategory;
  budget: number;
  actual: number;
  difference: number;
};

export type BudgetVsActual = {
  plannedTotal: number;
  actualTotal: number;
  remaining: number;
  usageRate: number;
  categories: CategoryBudgetVsActual[];
};

/** Derives budget-facing totals from persisted trip data, never presentation constants. */
export function getBudgetOverview(budgetItems: ExpenseItem[], expenses: LedgerItem[]) {
  const { actualTotal, plannedTotal, remaining } = getBudgetVsActual(budgetItems, expenses);
  return { actualTotal, plannedTotal, remaining };
}

/** Pure, shared budget comparison for all ledger views and future import flows. */
export function getBudgetVsActual(budgetItems: ExpenseItem[], expenses: LedgerItem[]): BudgetVsActual {
  const budgets = new Map<ExpenseCategory, number>();
  const actuals = new Map<ExpenseCategory, number>();
  for (const item of budgetItems) budgets.set(item.type, (budgets.get(item.type) ?? 0) + item.amount);
  for (const item of expenses) actuals.set(item.type, (actuals.get(item.type) ?? 0) + item.amount);
  const plannedTotal = budgetItems.reduce((sum, item) => sum + item.amount, 0);
  const actualTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const categories = expenseCategories
    .filter((category) => budgets.has(category) || actuals.has(category))
    .map((category) => {
      const budget = budgets.get(category) ?? 0;
      const actual = actuals.get(category) ?? 0;
      return { category, budget, actual, difference: budget - actual };
    });
  return { plannedTotal, actualTotal, remaining: plannedTotal - actualTotal, usageRate: plannedTotal > 0 ? (actualTotal / plannedTotal) * 100 : 0, categories };
}
