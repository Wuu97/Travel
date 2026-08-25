import { requestLlmCompletion, type LlmMessage } from "./client";
import { parseAiReply } from "./parser";
import { TRAVEL_DATA_REQUESTS_PROMPT, TRAVEL_SYSTEM_PROMPT } from "./prompt";
import { enrichAiReply } from "../enrichment/enrichReply";
import { mergeExecutedTravelData } from "../enrichment/richContent";
import type { TravelContext } from "../schemas/context";
import type { AiReply } from "../schemas/response";
import { executeDataRequests } from "../tools/executor";

export type AiRequest = {
  message: string;
  context?: string;
  travelContext?: TravelContext;
  history: Array<{ role: "user" | "assistant"; content: string }>;
};

export async function requestTravelAdvice({ context, history, message, travelContext }: AiRequest): Promise<AiReply> {
  const messages: LlmMessage[] = [
    { role: "system", content: TRAVEL_SYSTEM_PROMPT },
    { role: "system", content: TRAVEL_DATA_REQUESTS_PROMPT },
    ...(context ? [{ role: "system" as const, content: `仅在问题与当前行程相关时参考：${context}` }] : []),
    ...history,
    { role: "user", content: message },
  ];
  const parsed = parseAiReply(await requestLlmCompletion(messages));
  const executed = await executeDataRequests(parsed.dataRequests ?? [], { travelContext });
  const enriched = await enrichAiReply(mergeExecutedTravelData(parsed, executed), undefined, travelContext);
  const reply = { ...enriched };
  delete reply.dataRequests;
  return reply;
}
