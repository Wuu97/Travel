import { requestLlmCompletion, type LlmMessage } from "./client";
import type { TravelContext } from "../schemas/context";
import type { ExecutedTravelData } from "../tools/executor";
import { trimToolResults } from "../context-budget";

export const TRAVEL_TOOL_RESULT_REASONING_PROMPT = "You are given a first travel answer and verified travel data from external providers. Return only JSON {\"answer\": string}. Preserve useful itinerary logic, visiting order, qualitative advice, cautions, and practical travel guidance from the first answer; tool results must enhance the answer, never collapse it into a short fact list. Use provider facts as authoritative for rating, price, opening hours, route distance, route duration, and cost. Remove or rewrite any specific numerical rating, price, opening hour, route metric, or other factual claim in the first answer that is not supported by verifiedTravelData. Do not invent missing facts, image URLs, or new factual POIs as primary recommendations. Integrate verified facts naturally and keep the response proportional to the user question.";

type LlmCompletion = (messages: LlmMessage[]) => Promise<string>;

export function hasExecutedTravelData(data: ExecutedTravelData): boolean {
  return data.places.length > 0 || data.restaurants.length > 0 || data.routes.length > 0;
}

export function summarizeExecutedTravelData(data: ExecutedTravelData, maxTokens = 1_000) {
  return trimToolResults(data, maxTokens);
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
  input: { message: string; travelContext?: TravelContext; firstAnswer: string; data: ExecutedTravelData; toolResultBudget?: number },
  complete: LlmCompletion = requestLlmCompletion,
): Promise<string | undefined> {
  if (!hasExecutedTravelData(input.data)) return undefined;
  const messages: LlmMessage[] = [
    { role: "system", content: TRAVEL_TOOL_RESULT_REASONING_PROMPT },
    { role: "user", content: JSON.stringify({ userMessage: input.message, travelContext: input.travelContext, firstAnswer: input.firstAnswer, verifiedTravelData: summarizeExecutedTravelData(input.data, input.toolResultBudget) }) },
  ];
  try { return parseToolReasoningReply(await complete(messages)); }
  catch { return undefined; }
}
