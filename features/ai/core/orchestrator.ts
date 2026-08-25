import { requestLlmCompletion, type LlmMessage } from "./client";
import { parseAiReply } from "./parser";
import { TRAVEL_CONTEXT_PROMPT, TRAVEL_DATA_REQUESTS_PROMPT, TRAVEL_SYSTEM_PROMPT } from "./prompt";
import { mergeExecutedTravelData } from "../enrichment/richContent";
import type { TravelContext } from "../schemas/context";
import type { AiReply } from "../schemas/response";
import { executeDataRequests } from "../tools/executor";
import { reasonOverToolResults } from "./toolResultReasoning";
import { enrichExecutedTravelImages } from "../image/enrichExecutedTravelImages";
import { createCachedImageSearchProvider } from "../image/enrichPlaceImages";
import { WikimediaImageSearchProvider } from "../image/providers/wikimedia/provider";
import { buildBudgetedAiContextWithMemoryLoader } from "../context-builder";
import { resolveContextBudget } from "../context-budget";
import type { TravelMemory } from "../../memory/model";

export type AiRequest = {
  message: string;
  context?: string;
  travelContext?: TravelContext;
  loadMemories?: () => Promise<TravelMemory[]>;
  history: Array<{ role: "user" | "assistant"; content: string }>;
};

export async function requestTravelAdvice({ context, history, loadMemories, message, travelContext }: AiRequest): Promise<AiReply> {
  const contextBudget = resolveContextBudget({ query: message, tripDays: travelContext?.trip?.days });
  const aiContext = await buildBudgetedAiContextWithMemoryLoader({ userQuery: message, travelContext, loadMemories, budget: contextBudget });
  const messages: LlmMessage[] = [
    { role: "system", content: TRAVEL_SYSTEM_PROMPT },
    { role: "system", content: TRAVEL_DATA_REQUESTS_PROMPT },
    ...(aiContext.combinedContext ? [{ role: "system" as const, content: `${TRAVEL_CONTEXT_PROMPT}\n\n${aiContext.combinedContext}` }] : []),
    ...(context ? [{ role: "system" as const, content: `仅在问题与当前行程相关时参考：${context}` }] : []),
    ...history,
    { role: "user", content: message },
  ];
  const parsed = parseAiReply(await requestLlmCompletion(messages, { maxTokens: contextBudget.maxOutputTokens }));
  const executed = await executeDataRequests(parsed.dataRequests ?? [], { travelContext });
  const imageSearchProvider = createCachedImageSearchProvider(new WikimediaImageSearchProvider());
  const imageEnrichedData = await enrichExecutedTravelImages(executed, imageSearchProvider, travelContext);
  const enriched = mergeExecutedTravelData(parsed, imageEnrichedData);
  const reasonedAnswer = await reasonOverToolResults(
    { message, travelContext, firstAnswer: enriched.content, data: imageEnrichedData, toolResultBudget: contextBudget.maxToolResultTokens },
    (reasoningMessages) => requestLlmCompletion(reasoningMessages, { maxTokens: contextBudget.maxOutputTokens }),
  );
  const reply = { ...enriched, ...(reasonedAnswer ? { content: reasonedAnswer } : {}) };
  delete reply.dataRequests;
  return reply;
}
