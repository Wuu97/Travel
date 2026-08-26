import type { Dispatch, SetStateAction } from "react";
import type { ExpenseItem, ItineraryItem, LedgerItem } from "../model";
import { createTripExpense } from "../expense";
import { resolveExpenseRelation } from "../expenseRelations";
import { sortItineraryItems } from "../utils";

type Options = { budgetItems: ExpenseItem[]; expenses: LedgerItem[]; onImported?: (itineraryItemIds: string[], budgetItemIds: string[]) => void; plans: ItineraryItem[]; setBudgetItems: Dispatch<SetStateAction<ExpenseItem[]>>; setExpenses: Dispatch<SetStateAction<LedgerItem[]>>; setPlans: Dispatch<SetStateAction<ItineraryItem[]>> };

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
export function useTripImports({ budgetItems, expenses, onImported = () => {}, plans, setBudgetItems, setExpenses, setPlans }: Options) {
  const isPlanAdded = (item: ItineraryItem) => plans.some((plan) => plan.id === item.id || plan.title.trim() === item.title.trim());
  const isExpenseAdded = (item: ExpenseItem, destination: "budget" | "ledger") => destination === "budget"
    ? budgetItems.some((existing) => existing.id === item.id || (existing.title === item.title && existing.amount === item.amount))
    : expenses.some((existing) => existing.id === item.id || (existing.title === item.title && existing.amount === item.amount));
  const recordBatch = (itineraryItemIds: string[], budgetItemIds: string[]) => { if (itineraryItemIds.length || budgetItemIds.length) onImported(itineraryItemIds, budgetItemIds); };
  const addItineraryItems = (items: ItineraryItem[]) => { const added = items.filter((item) => !isPlanAdded(item)); setPlans((current) => sortItineraryItems([...current, ...added.map((item) => ({ ...item, creator: item.creator || "AI" }))])); recordBatch(added.map((item) => item.id), []); };
  const addExpenseItems = (items: ExpenseItem[], destination: "budget" | "ledger") => {
    if (destination === "budget") {
      const added = prepareExpenseImports(items, budgetItems, "estimated", plans); setBudgetItems((current) => [...current, ...added]); recordBatch([], added.map((item) => item.id));
      return;
    }
    setExpenses((current) => [...current, ...prepareExpenseImports(items, current, "actual", plans)]);
  };
  return { addExpenseItems, addItineraryItems, isExpenseAdded, isPlanAdded };
}
