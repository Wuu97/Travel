"use client";

import type { ItineraryItem } from "../../../trip/model";
import type { ItineraryAction } from "../../../ai/schemas/travel-response";
import { collectFeedbackEvent } from "../../../ai/feedback";

type Props = { action: ItineraryAction; index: number; targetName?: string; category?: string; isPlanAdded: (item: ItineraryItem) => boolean; onAddItineraries: (items: ItineraryItem[]) => void };

const itineraryType = (action: ItineraryAction): ItineraryItem["type"] => action.type === "add_place" ? "景点" : action.type === "add_restaurant" ? "餐饮" : "交通";

/** Uses the existing trip-import callback; clicking never writes directly to trip state. */
export function ItineraryActionButton({ action, index, targetName, category, isPlanAdded, onAddItineraries }: Props) {
  const item: ItineraryItem = { id: action.targetId || `structured-action-${index}`, title: targetName || action.title, type: itineraryType(action), note: action.title };
  const added = isPlanAdded(item);
  return <button className="rich-card-action" type="button" disabled={added} onClick={() => { onAddItineraries([item]); collectFeedbackEvent({ type: "add_to_trip", itemType: action.type === "add_place" ? "place" : action.type === "add_restaurant" ? "restaurant" : "route", itemId: action.targetId, category }); }}>{added ? "✓ 已加入" : "加入行程"}</button>;
}
