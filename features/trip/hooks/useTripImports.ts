import type { Dispatch, SetStateAction } from "react";
import type { ExpenseItem, ItineraryItem, LedgerItem } from "../model";
import { toLedgerItem } from "../expense";
import { sortItineraryItems } from "../utils";

type Options = { budgetItems: ExpenseItem[]; expenses: LedgerItem[]; plans: ItineraryItem[]; setBudgetItems: Dispatch<SetStateAction<ExpenseItem[]>>; setExpenses: Dispatch<SetStateAction<LedgerItem[]>>; setPlans: Dispatch<SetStateAction<ItineraryItem[]>> };

/** Applies structured AI recommendations with stable, user-visible de-duplication rules. */
export function useTripImports({ budgetItems, expenses, plans, setBudgetItems, setExpenses, setPlans }: Options) {
  const isPlanAdded = (item: ItineraryItem) => plans.some((plan) => plan.id === item.id || plan.title.trim() === item.title.trim());
  const isExpenseAdded = (item: ExpenseItem, destination: "budget" | "ledger") => (destination === "budget" ? budgetItems : expenses).some((existing) => destination === "budget" ? existing.id === item.id || (existing.title === item.title && existing.amount === item.amount) : existing.id === item.id || (existing.item === item.title && existing.amount === item.amount));
  const addItineraryItems = (items: ItineraryItem[]) => setPlans((current) => sortItineraryItems([...current, ...items.filter((item) => !current.some((plan) => plan.id === item.id || plan.title.trim() === item.title.trim())).map((item) => ({ ...item, creator: item.creator || "AI" }))]));
  const addExpenseItems = (items: ExpenseItem[], destination: "budget" | "ledger") => {
    if (destination === "budget") {
      setBudgetItems((current) => [...current, ...items.filter((item) => !current.some((existing) => existing.id === item.id || (existing.title === item.title && existing.amount === item.amount)))]);
      return;
    }
    setExpenses((current) => [...current, ...items.filter((item) => !current.some((existing) => existing.id === item.id || (existing.item === item.title && existing.amount === item.amount))).map((item) => toLedgerItem(item))]);
  };
  return { addExpenseItems, addItineraryItems, isExpenseAdded, isPlanAdded };
}
