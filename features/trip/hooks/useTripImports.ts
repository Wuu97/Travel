import type { Dispatch, SetStateAction } from "react";
import type { ExpenseItem, ItineraryItem, LedgerItem } from "../model";
import { createTripExpense } from "../expense";
import { resolveExpenseRelation } from "../expenseRelations";
import { sortItineraryItems } from "../utils";

type Options = { budgetItems: ExpenseItem[]; expenses: LedgerItem[]; onImported?: (itineraryItemIds: string[], budgetItemIds: string[]) => void; plans: ItineraryItem[]; setBudgetItems: Dispatch<SetStateAction<ExpenseItem[]>>; setExpenses: Dispatch<SetStateAction<LedgerItem[]>>; setPlans: Dispatch<SetStateAction<ItineraryItem[]>> };

export type ImportBatch = { batchId: string; importedAt: number; itineraryItemIds: string[]; budgetItemIds: string[] };

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

export function applyAiImportBatch(plans: ItineraryItem[], budgetItems: ExpenseItem[], incomingPlans: ItineraryItem[], incomingBudget: ExpenseItem[]) {
  const addedPlans = incomingPlans.filter((item) => !plans.some((plan) => plan.id === item.id || plan.title.trim() === item.title.trim())).map((item) => ({ ...item, creator: item.creator || "AI" }));
  const addedBudget = prepareExpenseImports(incomingBudget, budgetItems, "estimated", [...plans, ...addedPlans]);
  const batch: ImportBatch | null = addedPlans.length || addedBudget.length ? { batchId: crypto.randomUUID(), importedAt: Date.now(), itineraryItemIds: addedPlans.map((item) => item.id), budgetItemIds: addedBudget.map((item) => item.id) } : null;
  return { plans: sortItineraryItems([...plans, ...addedPlans]), budgetItems: [...budgetItems, ...addedBudget], batch };
}

export function undoAiImportBatch(plans: ItineraryItem[], budgetItems: ExpenseItem[], batch: ImportBatch) {
  return { plans: plans.filter((item) => !batch.itineraryItemIds.includes(item.id)), budgetItems: budgetItems.filter((item) => !batch.budgetItemIds.includes(item.id)) };
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
  const addImportBatch = (itineraryItems: ItineraryItem[], budgetItemsToAdd: ExpenseItem[]) => {
    const result = applyAiImportBatch(plans, budgetItems, itineraryItems, budgetItemsToAdd);
    setPlans(result.plans); setBudgetItems(result.budgetItems);
    if (result.batch) onImported(result.batch.itineraryItemIds, result.batch.budgetItemIds);
  };
  return { addExpenseItems, addImportBatch, addItineraryItems, isExpenseAdded, isPlanAdded };
}
