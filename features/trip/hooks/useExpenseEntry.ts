import type { Dispatch, SetStateAction } from "react";
import { createId } from "../../shared/utils/createId";
import { useConfirmation } from "../../shared/components/ConfirmDialog";
import type { ExpenseItem, ItineraryItem, LedgerItem } from "../model";
import type { EditingExpense } from "./useTripWorkspaceView";
import { createTripExpense } from "../expense";

type Options = { amount: string; date: string; payer: string; note: string; budgetItems: ExpenseItem[]; editingExpense: EditingExpense; expenses: LedgerItem[]; name: string; occurrence: "actual" | "estimated"; plans: ItineraryItem[]; relatedItineraryItemId: string; type: ExpenseItem["type"]; setAmount: (value: string) => void; setDate: (value: string) => void; setPayer: (value: string) => void; setNote: (value: string) => void; setBudgetItems: Dispatch<SetStateAction<ExpenseItem[]>>; setEditingExpense: (value: EditingExpense) => void; setExpenses: Dispatch<SetStateAction<LedgerItem[]>>; setName: (value: string) => void; setOccurrence: (value: "actual" | "estimated") => void; setRelatedItineraryItemId: (value: string) => void; setType: (value: ExpenseItem["type"]) => void; setVisible: (visible: boolean) => void };

/** Validates and records a manual actual expense. */
export function useExpenseEntry({ amount, date, payer, note, budgetItems, editingExpense, expenses, name, occurrence, plans, relatedItineraryItemId, setAmount, setDate, setPayer, setNote, setBudgetItems, setEditingExpense, setExpenses, setName, setOccurrence, setRelatedItineraryItemId, setType, setVisible, type }: Options) {
  const { confirm } = useConfirmation();
  const clearDraft = () => {
    setName("");
    setAmount("");
    setDate("");
    setPayer("");
    setNote("");
    setType("其他");
    setOccurrence("actual");
    setRelatedItineraryItemId("");
    setEditingExpense(null);
  };
  const addExpense = () => {
    const numericAmount = Number(amount);
    if (!name.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0 || (occurrence === "actual" && !payer.trim())) return;
    const plan = plans.find((item) => item.id === relatedItineraryItemId);
    const related = plan ? { relatedItineraryItemId: plan.id, relatedItineraryTitle: plan.title } : {};
    if (occurrence === "estimated") {
      const item = createTripExpense({ id: editingExpense?.occurrence === "estimated" ? editingExpense.id : createId("budget"), title: name, type, amount: numericAmount, occurrence: "estimated", note, ...related });
      setBudgetItems((current) => editingExpense?.occurrence === "estimated" ? current.map((existing) => existing.id === item.id ? item : existing) : [item, ...current]);
    } else {
      const item = createTripExpense({ id: editingExpense?.occurrence === "actual" ? editingExpense.id : createId("expense"), title: name, type, amount: numericAmount, occurrence: "actual", date, payer, note, ...related });
      setExpenses((current) => editingExpense?.occurrence === "actual" ? current.map((existing) => existing.id === item.id ? item : existing) : [item, ...current]);
    }
    clearDraft();
    setVisible(false);
  };
  const cancelExpense = () => {
    clearDraft();
    setVisible(false);
  };
  const editExpense = (id: string, itemOccurrence: "actual" | "estimated") => {
    const item = itemOccurrence === "actual" ? expenses.find((entry) => entry.id === id) : budgetItems.find((entry) => entry.id === id);
    if (!item) return;
    setName(item.title);
    setAmount(String(item.amount));
    setType(item.type);
    setOccurrence(itemOccurrence);
    setRelatedItineraryItemId(item.relatedItineraryItemId ?? "");
    setDate(item.date ?? ""); setPayer(item.payer ?? ""); setNote(item.note ?? "");
    setEditingExpense({ id, occurrence: itemOccurrence });
    setVisible(true);
  };
  const removeExpense = async (id: string) => {
    if (!await confirm({ title: "删除实际消费？", description: "这笔实际消费将被永久删除。" })) return;
    setExpenses((current) => current.filter((item) => item.id !== id));
  };
  const removeBudgetItem = async (id: string) => {
    if (!await confirm({ title: "移除预计费用？", description: "这项预计费用将被永久移除。" })) return;
    setBudgetItems((current) => current.filter((item) => item.id !== id));
  };
  return { addExpense, cancelExpense, editExpense, removeBudgetItem, removeExpense };
}
