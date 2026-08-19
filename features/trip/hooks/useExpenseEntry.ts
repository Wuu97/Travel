import type { Dispatch, SetStateAction } from "react";
import type { ExpenseItem, ItineraryItem, LedgerItem } from "../model";
import type { EditingExpense } from "./useTripWorkspaceView";
import { createTripExpense, toBudgetItem, toLedgerItem } from "../expense";

type Options = { amount: string; budgetItems: ExpenseItem[]; editingExpense: EditingExpense; expenses: LedgerItem[]; name: string; occurrence: "actual" | "estimated"; plans: ItineraryItem[]; relatedItineraryItemId: string; type: ExpenseItem["type"]; setAmount: (value: string) => void; setBudgetItems: Dispatch<SetStateAction<ExpenseItem[]>>; setEditingExpense: (value: EditingExpense) => void; setExpenses: Dispatch<SetStateAction<LedgerItem[]>>; setName: (value: string) => void; setOccurrence: (value: "actual" | "estimated") => void; setRelatedItineraryItemId: (value: string) => void; setType: (value: ExpenseItem["type"]) => void; setVisible: (visible: boolean) => void };

/** Validates and records a manual actual expense. */
export function useExpenseEntry({ amount, budgetItems, editingExpense, expenses, name, occurrence, plans, relatedItineraryItemId, setAmount, setBudgetItems, setEditingExpense, setExpenses, setName, setOccurrence, setRelatedItineraryItemId, setType, setVisible, type }: Options) {
  const addExpense = () => {
    const numericAmount = Number(amount);
    if (!name.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return;
    const plan = plans.find((item) => item.id === relatedItineraryItemId);
    const related = plan ? { relatedItineraryItemId: plan.id, relatedItineraryTitle: plan.title } : {};
    if (occurrence === "estimated") {
      const item = toBudgetItem(createTripExpense({ id: editingExpense?.occurrence === "estimated" ? editingExpense.id : `budget-${Date.now()}`, title: name.trim(), type, amount: numericAmount, occurrence: "estimated", ...related }));
      setBudgetItems((current) => editingExpense?.occurrence === "estimated" ? current.map((existing) => existing.id === item.id ? item : existing) : [item, ...current]);
    } else {
      const item = toLedgerItem(createTripExpense({ id: editingExpense?.occurrence === "actual" ? editingExpense.id : `expense-${Date.now()}`, title: name.trim(), type, amount: numericAmount, occurrence: "actual", ...related }));
      setExpenses((current) => editingExpense?.occurrence === "actual" ? current.map((existing) => existing.id === item.id ? item : existing) : [item, ...current]);
    }
    setName("");
    setAmount("");
    setRelatedItineraryItemId("");
    setEditingExpense(null);
    setVisible(false);
  };
  const editExpense = (id: string, itemOccurrence: "actual" | "estimated") => {
    const item = itemOccurrence === "actual" ? expenses.find((entry) => entry.id === id) : budgetItems.find((entry) => entry.id === id);
    if (!item) return;
    setName("item" in item ? item.item : item.title);
    setAmount(String(item.amount));
    setType(item.type);
    setOccurrence(itemOccurrence);
    setRelatedItineraryItemId(item.relatedItineraryItemId ?? "");
    setEditingExpense({ id, occurrence: itemOccurrence });
    setVisible(true);
  };
  const removeExpense = (id: string) => {
    if (!window.confirm("确定删除这笔实际消费吗？")) return;
    setExpenses((current) => current.filter((item) => item.id !== id));
  };
  const removeBudgetItem = (id: string) => {
    if (!window.confirm("确定移除这项预计费用吗？")) return;
    setBudgetItems((current) => current.filter((item) => item.id !== id));
  };
  return { addExpense, editExpense, removeBudgetItem, removeExpense };
}
