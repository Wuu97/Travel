import type { ExpenseItem, ItineraryItem } from "../../trip/model";
import type { ChatMessage } from "../model";
import { ChatImportPanel } from "./ChatImportPanel";
import { StructuredTravelResponse } from "../../travel/components/ai/StructuredTravelResponse";
import { AiRichContent } from "./AiRichContent";
import { useTripCapabilities } from "../../trip/components/TripCapabilities";

type Props = { isExpenseAdded: (item: ExpenseItem, destination: "budget" | "ledger") => boolean; isPlanAdded: (item: ItineraryItem) => boolean; onAddExpenses: (items: ExpenseItem[], destination: "budget" | "ledger") => void; onAddImportBatch: (plans: ItineraryItem[], budget: ExpenseItem[]) => void; onAddItineraries: (items: ItineraryItem[]) => void; onToggle: (id: string) => void; onToggleMany: (ids: string[]) => void; selected: Record<string, boolean> };

/** Adapts trip-domain import actions to the chat message-list renderer contract. */
export function createTripImportRenderer({ isExpenseAdded, isPlanAdded, onAddExpenses, onAddImportBatch, onAddItineraries, onToggle, onToggleMany, selected }: Props) {
  return function renderTripImports(message: ChatMessage) {
    return <TripImportContent isExpenseAdded={isExpenseAdded} isPlanAdded={isPlanAdded} message={message} onAddExpenses={onAddExpenses} onAddImportBatch={onAddImportBatch} onAddItineraries={onAddItineraries} onToggle={onToggle} onToggleMany={onToggleMany} selected={selected} />;
  };
}

function TripImportContent({ isExpenseAdded, isPlanAdded, message, onAddExpenses, onAddImportBatch, onAddItineraries, onToggle, onToggleMany, selected }: Props & { message: ChatMessage }) {
  const { canEditTrip } = useTripCapabilities();
  const addItineraries = (items: ItineraryItem[]) => { if (canEditTrip) onAddItineraries(items); };
  const addExpenses = (items: ExpenseItem[], destination: "budget" | "ledger") => { if (canEditTrip) onAddExpenses(items, destination); };
  const addImportBatch = (plans: ItineraryItem[], budget: ExpenseItem[]) => { if (canEditTrip) onAddImportBatch(plans, budget); };
  const toggle = (id: string) => { if (canEditTrip) onToggle(id); };
  const toggleMany = (ids: string[]) => { if (canEditTrip) onToggleMany(ids); };
  return <>{message.structuredTravelResponse
      ? <StructuredTravelResponse response={message.structuredTravelResponse} content={message.richContent} isPlanAdded={isPlanAdded} onAddItineraries={addItineraries} />
      : <AiRichContent content={message.richContent} isPlanAdded={isPlanAdded} onAddItineraries={addItineraries} />}
      <ChatImportPanel isExpenseAdded={isExpenseAdded} isPlanAdded={isPlanAdded} message={message} onAddExpenses={addExpenses} onAddImportBatch={addImportBatch} onAddItineraries={addItineraries} onToggle={toggle} onToggleMany={toggleMany} selected={selected} /></>;
}
