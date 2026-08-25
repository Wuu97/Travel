import type { RichContent } from "../../../chat/model";
import type { ItineraryItem } from "../../../trip/model";
import { AiRichContent } from "../../../chat/components/AiRichContent";

type Props = { content?: RichContent; isPlanAdded: (item: ItineraryItem) => boolean; onAddItineraries: (items: ItineraryItem[]) => void };

/** Presentation boundary for the structured AI response; it reuses the established card and import UX. */
export function StructuredTravelResponse({ content, isPlanAdded, onAddItineraries }: Props) {
  return <AiRichContent content={content} isPlanAdded={isPlanAdded} onAddItineraries={onAddItineraries} />;
}
