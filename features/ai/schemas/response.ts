import type { ExpenseItem, ItineraryItem } from "../../trip/model";
import type { AiDataRequest } from "./dataRequests";

/** Parsed contract returned by the travel AI engine. */
export type AiReply = {
  content: string;
  richContent?: unknown;
  itineraryItems: ItineraryItem[];
  expenseItems: ExpenseItem[];
  dataRequests?: AiDataRequest[];
};
