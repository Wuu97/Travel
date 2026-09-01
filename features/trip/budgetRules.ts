import type { ExpenseCategory, ExpenseItem, LedgerItem } from "./model";

const expenseCategories: ExpenseCategory[] = ["住宿", "餐饮", "交通", "门票", "活动", "其他"];

export type CategoryBudgetVsActual = {
  category: ExpenseCategory;
  budget: number;
  actual: number;
  difference: number;
};

export type BudgetVsActual = {
  totalBudget: number | null;
  estimatedTotal: number;
  actualTotal: number;
  remainingBudget: number | null;
  usageRate: number | null;
  categories: CategoryBudgetVsActual[];
};

/** Derives budget-facing totals from persisted trip data, never presentation constants. */
export function getBudgetOverview(totalBudget: number | null, budgetItems: ExpenseItem[], expenses: LedgerItem[]): { totalBudget: number | null; actualTotal: number; estimatedTotal: number; remainingBudget: number | null };
/** @deprecated Supply totalBudget explicitly; retained for export callers during migration. */
export function getBudgetOverview(budgetItems: ExpenseItem[], expenses: LedgerItem[]): { totalBudget: null; actualTotal: number; estimatedTotal: number; remainingBudget: null; plannedTotal: number };
export function getBudgetOverview(totalBudgetOrItems: number | null | ExpenseItem[], budgetItemsOrExpenses: ExpenseItem[] | LedgerItem[], maybeExpenses?: LedgerItem[]) {
  const legacy = Array.isArray(totalBudgetOrItems);
  const totalBudget = legacy ? null : totalBudgetOrItems;
  const budgetItems = legacy ? totalBudgetOrItems : budgetItemsOrExpenses as ExpenseItem[];
  const expenses = legacy ? budgetItemsOrExpenses as LedgerItem[] : maybeExpenses!;
  const { actualTotal, estimatedTotal, remainingBudget } = getBudgetVsActual(totalBudget, budgetItems, expenses);
  return legacy ? { totalBudget, actualTotal, estimatedTotal, remainingBudget, plannedTotal: estimatedTotal } : { totalBudget, actualTotal, estimatedTotal, remainingBudget };
}

/** Pure, shared budget comparison for all ledger views and future import flows. */
export function getBudgetVsActual(totalBudget: number | null, budgetItems: ExpenseItem[], expenses: LedgerItem[]): BudgetVsActual {
  const budgets = new Map<ExpenseCategory, number>();
  const actuals = new Map<ExpenseCategory, number>();
  for (const item of budgetItems) budgets.set(item.type, (budgets.get(item.type) ?? 0) + item.amount);
  for (const item of expenses) actuals.set(item.type, (actuals.get(item.type) ?? 0) + item.amount);
  const estimatedTotal = budgetItems.reduce((sum, item) => sum + item.amount, 0);
  const actualTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const categories = expenseCategories
    .filter((category) => budgets.has(category) || actuals.has(category))
    .map((category) => {
      const budget = budgets.get(category) ?? 0;
      const actual = actuals.get(category) ?? 0;
      return { category, budget, actual, difference: budget - actual };
    });
  const remainingBudget = totalBudget === null ? null : totalBudget - actualTotal;
  const usageRate = totalBudget !== null && totalBudget > 0 ? (actualTotal / totalBudget) * 100 : null;
  return { totalBudget, estimatedTotal, actualTotal, remainingBudget, usageRate, categories };
}
