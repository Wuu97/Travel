import type { ExpenseItem, ItineraryItem } from "../../trip/model";

/** Parsed contract returned by the travel AI engine. */
export type AiReply = {
  content: string;
  richContent?: unknown;
  itineraryItems: ItineraryItem[];
  expenseItems: ExpenseItem[];
};
