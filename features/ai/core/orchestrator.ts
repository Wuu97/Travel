import { requestLlmCompletion, type LlmMessage } from "./client";
import { parseAiReply } from "./parser";
import { STRUCTURED_TRAVEL_RESPONSE_PROMPT, TRAVEL_CONTEXT_PROMPT, TRAVEL_DATA_REQUESTS_PROMPT, TRAVEL_SYSTEM_PROMPT } from "./prompt";
import { mergeExecutedTravelData } from "../enrichment/richContent";
import type { TravelContext } from "../schemas/context";
import type { AiReply } from "../schemas/response";
import { executeDataRequests } from "../tools/executor";
import { reasonOverToolResults } from "./toolResultReasoning";
import { enrichExecutedTravelImages } from "../image/enrichExecutedTravelImages";
import { createCachedImageSearchProvider } from "../image/enrichPlaceImages";
import { WikimediaImageSearchProvider } from "../image/providers/wikimedia/provider";
import { buildBudgetedAiContextWithMemoryLoader } from "../context-builder";
import { estimateTokenCount, limitContextText, resolveContextBudget, trimHistoryByBudget } from "../context-budget";
import type { TravelMemory } from "../../memory/model";
import { getRelevantMemoryContext } from "../../memory/retrieval";
import { createRecommendationContext, rankTravelItems } from "../recommendation";

export type AiRequest = {
  message: string;
  context?: string;
  travelContext?: TravelContext;
  loadMemories?: () => Promise<TravelMemory[]>;
  history: Array<{ role: "user" | "assistant"; content: string }>;
};

export async function requestTravelAdvice({ context, history, loadMemories, message, travelContext }: AiRequest): Promise<AiReply> {
  const contextBudget = resolveContextBudget({ query: message, tripDays: travelContext?.trip?.days });
  let loadedMemories: TravelMemory[] = [];
  let memoryLoaded = false;
  const loadMemoriesOnce = loadMemories ? async () => {
    if (memoryLoaded) return loadedMemories;
    memoryLoaded = true;
    loadedMemories = await loadMemories();
    return loadedMemories;
  } : undefined;
  const aiContext = await buildBudgetedAiContextWithMemoryLoader({ userQuery: message, travelContext, loadMemories: loadMemoriesOnce, budget: contextBudget });
  const baseMessages: LlmMessage[] = [
    { role: "system", content: TRAVEL_SYSTEM_PROMPT },
    { role: "system", content: STRUCTURED_TRAVEL_RESPONSE_PROMPT },
    { role: "system", content: TRAVEL_DATA_REQUESTS_PROMPT },
    ...(context ? [{ role: "system" as const, content: `仅在问题与当前行程相关时参考：${context}` }] : []),
  ];
  const contextAllowance = Math.max(0, contextBudget.maxContextTokens - estimateTokenCount(message) - baseMessages.reduce((total, item) => total + estimateTokenCount(item.content), 0));
  const boundedContext = limitContextText(aiContext.combinedContext, contextAllowance);
  const fixedMessages: LlmMessage[] = [
    ...baseMessages,
    ...(boundedContext ? [{ role: "system" as const, content: `${TRAVEL_CONTEXT_PROMPT}\n\n${boundedContext}` }] : []),
  ];
  const historyBudget = Math.max(0, contextBudget.maxContextTokens - estimateTokenCount(message) - fixedMessages.reduce((total, item) => total + estimateTokenCount(item.content), 0));
  const messages: LlmMessage[] = [
    ...fixedMessages,
    ...trimHistoryByBudget(history, historyBudget),
    { role: "user", content: message },
  ];
  const parsed = parseAiReply(await requestLlmCompletion(messages, { maxTokens: contextBudget.maxOutputTokens }));
  const executed = await executeDataRequests(parsed.dataRequests ?? [], { travelContext });
  const imageSearchProvider = createCachedImageSearchProvider(new WikimediaImageSearchProvider());
  const imageEnrichedData = await enrichExecutedTravelImages(executed, imageSearchProvider, travelContext);
  const recommendationContext = createRecommendationContext(getRelevantMemoryContext({ memories: loadedMemories, query: message, context: travelContext }).memories, message);
  const places = rankTravelItems({ items: imageEnrichedData.places, memoryContext: recommendationContext, travelContext });
  const restaurants = rankTravelItems({ items: imageEnrichedData.restaurants, memoryContext: recommendationContext, travelContext });
  const rankedData = { ...imageEnrichedData, places: places.sortedItems, restaurants: restaurants.sortedItems };
  const enriched = mergeExecutedTravelData(parsed, rankedData);
  const reasonedAnswer = await reasonOverToolResults(
    { message, travelContext, firstAnswer: enriched.content, data: rankedData, toolResultBudget: contextBudget.maxToolResultTokens, recommendationMeta: [...places.scores, ...restaurants.scores] },
    (reasoningMessages) => requestLlmCompletion(reasoningMessages, { maxTokens: contextBudget.maxOutputTokens }),
  );
  const reply = { ...enriched, ...(reasonedAnswer ? { content: reasonedAnswer } : {}) };
  delete reply.dataRequests;
  return reply;
}
