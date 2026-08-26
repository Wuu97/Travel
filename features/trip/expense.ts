import type { ExpenseCategory, TripExpense } from "./model";
import { createId } from "../shared/utils/createId";

const expenseCategories = new Set<ExpenseCategory>(["住宿", "餐饮", "交通", "门票", "活动", "其他"]);
export type TripExpenseInput = Omit<TripExpense, "id" | "title" | "amount" | "date" | "payer" | "note"> & { id?: string; title: string; amount: number; date?: string; payer?: string; note?: string };

/** Converts pre-5.1 LedgerItem / partial snapshots into the shared expense model. */
export function normalizeTripExpense(value: Record<string, unknown>, fallbackOccurrence: TripExpense["occurrence"]): TripExpense | null {
  const title = typeof value.title === "string" ? value.title : typeof value.item === "string" ? value.item : "";
  const occurrence = value.occurrence === "actual" || value.occurrence === "estimated" ? value.occurrence : fallbackOccurrence;
  if (!title.trim() || !expenseCategories.has(value.type as ExpenseCategory) || !Number.isFinite(value.amount) || typeof value.amount !== "number" || value.amount <= 0) return null;
  return createTripExpense({
    id: typeof value.id === "string" && value.id ? value.id : undefined,
    title, type: value.type as ExpenseCategory, amount: value.amount, occurrence,
    ...(typeof value.relatedItineraryItemId === "string" ? { relatedItineraryItemId: value.relatedItineraryItemId } : {}),
    ...(typeof value.relatedItineraryTitle === "string" ? { relatedItineraryTitle: value.relatedItineraryTitle } : {}),
    ...(typeof value.date === "string" ? { date: value.date } : {}),
    ...(typeof value.payer === "string" ? { payer: value.payer } : typeof value.by === "string" ? { payer: value.by } : {}),
    ...(typeof value.note === "string" ? { note: value.note } : {}),
  });
}

/** The sole constructor for new and normalized expense records. */
export function createTripExpense(input: TripExpenseInput): TripExpense {
  const { date, id, note, payer, title: rawTitle, ...required } = input;
  const title = rawTitle.trim();
  if (!title || !Number.isFinite(required.amount) || required.amount <= 0 || !expenseCategories.has(required.type)) throw new TypeError("Invalid trip expense");
  return {
    ...required, id: id?.trim() || createId("expense"), title,
    ...(date?.trim() ? { date: date.trim() } : {}),
    ...(payer?.trim() ? { payer: payer.trim() } : {}),
    ...(note?.trim() ? { note: note.trim() } : {}),
  };
}
