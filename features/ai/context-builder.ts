import { formatTravelContext, type TravelContext } from "./schemas/context";
import { getRelevantMemoryContext } from "../memory/retrieval";
import type { TravelMemory } from "../memory/model";
import { estimateTokenCount, trimMemoryContext, trimTextToTokenBudget, type ContextBudget } from "./context-budget";

export type AiContextBuilderInput = {
  userQuery: string;
  travelContext?: TravelContext;
  memories?: TravelMemory[];
};

export type AiContext = {
  travelContextText: string;
  memoryContextText: string;
  combinedContext: string;
};

const memoryPriority = "这些是辅助性的长期偏好。优先级为：用户当前明确需求 > 当前旅行信息 > 用户长期偏好。";

/** Builds bounded, readable AI context without changing the system prompt itself. */
export function buildAiContext(input: AiContextBuilderInput): AiContext {
  const travelContextText = formatTravelContext(input.travelContext) ?? "";
  const { formattedContext: memoryContextText } = getRelevantMemoryContext({
    memories: input.memories ?? [],
    query: input.userQuery,
    context: input.travelContext,
  });
  const sections = [
    travelContextText ? `[Travel Context]\n${travelContextText}` : "",
    memoryContextText ? `[User Preference]\n${memoryContextText}\n${memoryPriority}` : "",
  ].filter(Boolean);
  return { travelContextText, memoryContextText, combinedContext: sections.join("\n\n") };
}

/** Builds the same contextual block with a bounded memory section for model requests. */
export function buildBudgetedAiContext(input: AiContextBuilderInput & { budget: ContextBudget }): AiContext {
  const travelContextText = formatTravelContext(input.travelContext) ?? "";
  const { memories } = getRelevantMemoryContext({
    memories: input.memories ?? [],
    query: input.userQuery,
    context: input.travelContext,
  });
  const memoryContextText = trimMemoryContext(memories, input.budget.maxMemoryTokens);
  const sections = [
    travelContextText ? `[Travel Context]\n${travelContextText}` : "",
    memoryContextText ? `[User Preference]\n${memoryContextText}\n${memoryPriority}` : "",
  ].filter(Boolean);
  const combinedContext = sections.join("\n\n");
  return {
    travelContextText,
    memoryContextText,
    combinedContext: estimateTokenCount(combinedContext) <= input.budget.maxContextTokens
      ? combinedContext
      : trimTextToTokenBudget(combinedContext, input.budget.maxContextTokens),
  };
}

/** Loads user memories opportunistically; loader errors never block normal AI advice. */
export async function buildAiContextWithMemoryLoader(
  input: Omit<AiContextBuilderInput, "memories"> & { loadMemories?: () => Promise<TravelMemory[]> },
): Promise<AiContext> {
  let memories: TravelMemory[] = [];
  if (input.loadMemories) {
    try { memories = await input.loadMemories(); }
    catch { memories = []; }
  }
  return buildAiContext({ userQuery: input.userQuery, travelContext: input.travelContext, memories });
}

export async function buildBudgetedAiContextWithMemoryLoader(
  input: Omit<AiContextBuilderInput, "memories"> & { budget: ContextBudget; loadMemories?: () => Promise<TravelMemory[]> },
): Promise<AiContext> {
  let memories: TravelMemory[] = [];
  if (input.loadMemories) {
    try { memories = await input.loadMemories(); }
    catch { memories = []; }
  }
  return buildBudgetedAiContext({ userQuery: input.userQuery, travelContext: input.travelContext, memories, budget: input.budget });
}
