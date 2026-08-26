export type TravelFeedbackEvent = { id?: string; type: "add_to_trip" | "remove_from_trip" | "keep_recommendation" | "skip_recommendation"; itemType: "place" | "restaurant" | "route"; itemId?: string; category?: string; timestamp: string };
export type FeedbackPreferenceSignal = { interests?: string[]; dislikes?: string[]; preferredTypes?: string[] };

export function normalizeFeedbackEvent(value: unknown): TravelFeedbackEvent | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>; const types = ["add_to_trip", "remove_from_trip", "keep_recommendation", "skip_recommendation"] as const; const itemTypes = ["place", "restaurant", "route"] as const;
  const text = (item: unknown, max = 120) => typeof item === "string" && item.trim() && item.trim().length <= max ? item.trim() : undefined;
  const type = raw.type; const itemType = raw.itemType; const timestamp = text(raw.timestamp, 40);
  return typeof type === "string" && types.includes(type as TravelFeedbackEvent["type"]) && typeof itemType === "string" && itemTypes.includes(itemType as TravelFeedbackEvent["itemType"]) && timestamp && !Number.isNaN(Date.parse(timestamp)) ? { type: type as TravelFeedbackEvent["type"], itemType: itemType as TravelFeedbackEvent["itemType"], itemId: text(raw.itemId), category: text(raw.category), timestamp } : undefined;
}
