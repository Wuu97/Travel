import { requestLlmCompletion, type LlmMessage } from "./client";
import type { TravelContext } from "../schemas/context";
import type { ExecutedTravelData } from "../tools/executor";

export const TRAVEL_TOOL_RESULT_REASONING_PROMPT = "You are given verified travel data from external providers. Return only JSON {\"answer\": string}. Use provider facts as authoritative for rating, price, opening hours, route distance, and route duration. Do not invent missing facts, image URLs, or new factual POIs as primary recommendations. Explain and compare only the supplied results in relation to the user question.";

type LlmCompletion = (messages: LlmMessage[]) => Promise<string>;

export function hasExecutedTravelData(data: ExecutedTravelData): boolean {
  return data.places.length > 0 || data.restaurants.length > 0 || data.routes.length > 0;
}

export function summarizeExecutedTravelData(data: ExecutedTravelData) {
  return {
    places: data.places.slice(0, 5).map(({ name, category, area, rating, openingHours }) => ({ type: "place", name, category, area, rating, openingHours })),
    restaurants: data.restaurants.slice(0, 5).map(({ name, cuisine, area, rating, averagePrice, priceText, openingHours }) => ({ type: "restaurant", name, cuisine, area, rating, averagePrice, priceText, openingHours })),
    routes: data.routes.slice(0, 3).map(({ from, to, mode, durationMinutes, distanceMeters, costText }) => ({ type: "route", from: from.name, to: to.name, mode, durationMinutes, distanceMeters, costText })),
  };
}

function parseToolReasoningReply(content: string): string | undefined {
  const normalized = content.trim().replace(/^```(?:json)?\s*|\s*```$/gi, "");
  try {
    const parsed = JSON.parse(normalized) as { answer?: unknown; content?: unknown };
    const answer = typeof parsed.answer === "string" ? parsed.answer : typeof parsed.content === "string" ? parsed.content : undefined;
    return answer?.trim() || undefined;
  } catch { return undefined; }
}

export async function reasonOverToolResults(
  input: { message: string; travelContext?: TravelContext; firstAnswer: string; data: ExecutedTravelData },
  complete: LlmCompletion = requestLlmCompletion,
): Promise<string | undefined> {
  if (!hasExecutedTravelData(input.data)) return undefined;
  const messages: LlmMessage[] = [
    { role: "system", content: TRAVEL_TOOL_RESULT_REASONING_PROMPT },
    { role: "user", content: JSON.stringify({ userMessage: input.message, travelContext: input.travelContext, firstAnswer: input.firstAnswer, verifiedTravelData: summarizeExecutedTravelData(input.data) }) },
  ];
  try { return parseToolReasoningReply(await complete(messages)); }
  catch { return undefined; }
}
