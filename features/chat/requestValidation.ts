import { isRecord, isShortString } from "../shared/validation";
import { normalizeTravelContext, type TravelContext } from "../ai/schemas/context";
import { normalizeFeedbackEvent, type TravelFeedbackEvent } from "../ai/feedback";

type ChatMessage = { role: "user" | "assistant"; content: string };

export type AiRequest = { message: string; context?: string; travelContext?: TravelContext; feedbackEvents?: TravelFeedbackEvent[]; history: ChatMessage[] };

export function parseAiRequest(value: unknown): AiRequest | null {
  if (!isRecord(value) || !isShortString(value.message) || !value.message.trim()) return null;
  const message = value.message;
  if (value.context !== undefined && !isShortString(value.context, 6_000)) return null;
  if (value.history !== undefined && !Array.isArray(value.history)) return null;
  const history = Array.isArray(value.history) ? value.history : [];
  if (history.length > 8 || !history.every((message) => isRecord(message) && (message.role === "user" || message.role === "assistant") && isShortString(message.content, 4_000))) return null;
  const feedbackEvents = Array.isArray(value.feedbackEvents) ? value.feedbackEvents.map(normalizeFeedbackEvent).filter((event): event is TravelFeedbackEvent => Boolean(event)).slice(-100) : [];
  return { message: message.trim(), context: typeof value.context === "string" ? value.context : undefined, travelContext: normalizeTravelContext(value.travelContext), ...(feedbackEvents.length ? { feedbackEvents } : {}), history: history as ChatMessage[] };
}
