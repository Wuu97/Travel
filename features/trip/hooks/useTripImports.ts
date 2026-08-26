import type { Dispatch, SetStateAction } from "react";
import type { ExpenseItem, ItineraryItem, LedgerItem } from "../model";
import { createTripExpense } from "../expense";
import { resolveExpenseRelation } from "../expenseRelations";
import { sortItineraryItems } from "../utils";

type Options = { budgetItems: ExpenseItem[]; expenses: LedgerItem[]; plans: ItineraryItem[]; setBudgetItems: Dispatch<SetStateAction<ExpenseItem[]>>; setExpenses: Dispatch<SetStateAction<LedgerItem[]>>; setPlans: Dispatch<SetStateAction<ItineraryItem[]>> };

/** Normalizes a user-selected AI batch while preventing duplicates within and across imports. */
export function prepareExpenseImports(items: ExpenseItem[], existing: ExpenseItem[], occurrence: "estimated" | "actual" = "estimated", plans: ItineraryItem[] = []) {
  const seen = new Set(existing.map((item) => `${item.id}|${item.title}|${item.amount}`));
  return items.flatMap((item) => {
    const key = `${item.id}|${item.title}|${item.amount}`;
    if (seen.has(key)) return [];
    seen.add(key);
    return [createTripExpense({ ...resolveExpenseRelation(item, plans), occurrence })];
  });
}

/** Applies structured AI recommendations with stable, user-visible de-duplication rules. */
export function useTripImports({ budgetItems, expenses, plans, setBudgetItems, setExpenses, setPlans }: Options) {
  const isPlanAdded = (item: ItineraryItem) => plans.some((plan) => plan.id === item.id || plan.title.trim() === item.title.trim());
  const isExpenseAdded = (item: ExpenseItem, destination: "budget" | "ledger") => destination === "budget"
    ? budgetItems.some((existing) => existing.id === item.id || (existing.title === item.title && existing.amount === item.amount))
    : expenses.some((existing) => existing.id === item.id || (existing.title === item.title && existing.amount === item.amount));
  const addItineraryItems = (items: ItineraryItem[]) => setPlans((current) => sortItineraryItems([...current, ...items.filter((item) => !current.some((plan) => plan.id === item.id || plan.title.trim() === item.title.trim())).map((item) => ({ ...item, creator: item.creator || "AI" }))]));
  const addExpenseItems = (items: ExpenseItem[], destination: "budget" | "ledger") => {
    if (destination === "budget") {
      setBudgetItems((current) => [...current, ...prepareExpenseImports(items, current, "estimated", plans)]);
      return;
    }
    setExpenses((current) => [...current, ...prepareExpenseImports(items, current, "actual", plans)]);
  };
  return { addExpenseItems, addItineraryItems, isExpenseAdded, isPlanAdded };
}
