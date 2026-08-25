import type { ExpenseItem, ItineraryItem } from "../../trip/model";
import type { AiDataRequest } from "./dataRequests";
import type { StructuredTravelResponse } from "./travel-response";

/** Parsed contract returned by the travel AI engine. */
export type AiReply = {
  content: string;
  richContent?: unknown;
  itineraryItems: ItineraryItem[];
  expenseItems: ExpenseItem[];
  dataRequests?: AiDataRequest[];
  structuredTravelResponse?: StructuredTravelResponse;
};
