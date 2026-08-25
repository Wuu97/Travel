import type { ExpenseItem, ItineraryItem } from "../../trip/model";
import type { ChatMessage } from "../model";
import { ChatImportPanel } from "./ChatImportPanel";
import { StructuredTravelResponse } from "../../travel/components/ai/StructuredTravelResponse";

type Props = { isExpenseAdded: (item: ExpenseItem, destination: "budget" | "ledger") => boolean; isPlanAdded: (item: ItineraryItem) => boolean; onAddExpenses: (items: ExpenseItem[], destination: "budget" | "ledger") => void; onAddItineraries: (items: ItineraryItem[]) => void; onToggle: (id: string) => void; selected: Record<string, boolean> };

/** Adapts trip-domain import actions to the chat message-list renderer contract. */
export function createTripImportRenderer({ isExpenseAdded, isPlanAdded, onAddExpenses, onAddItineraries, onToggle, selected }: Props) {
  return function renderTripImports(message: ChatMessage) {
    return <><StructuredTravelResponse content={message.richContent} isPlanAdded={isPlanAdded} onAddItineraries={onAddItineraries} /><ChatImportPanel isExpenseAdded={isExpenseAdded} isPlanAdded={isPlanAdded} message={message} onAddExpenses={onAddExpenses} onAddItineraries={onAddItineraries} onToggle={onToggle} selected={selected} /></>;
  };
}
