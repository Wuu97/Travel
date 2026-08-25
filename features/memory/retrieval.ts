import type { TravelContext } from "../ai/schemas/context";
import type { TravelMemory } from "./model";
import { buildMemoryContext } from "./context";

export const MAX_RELEVANT_MEMORIES = 5;

const interestTerms: Record<string, RegExp> = {
  nature: /(?:自然|风景|山景|湖泊|森林|徒步|峡谷)/i,
  food: /(?:美食|吃什么|餐厅|小吃|菜|餐饮)/i,
  photography: /(?:摄影|拍照|取景)/i,
  culture: /(?:历史|文化|博物馆|古迹)/i,
};
const planningRequest = /(?:规划|安排|路线|行程|怎么玩|旅行计划|几天|自驾|环线)/i;
const transportRequest = /(?:交通|自驾|公共交通|开车|公交|地铁|路线|行程)/i;
const shoppingRequest = /(?:购物|商场|购物中心|买东西)/i;

const matchesInterest = (interest: string, query: string) => interestTerms[interest.trim().toLowerCase()]?.test(query) || query.toLowerCase().includes(interest.trim().toLowerCase());

function selectMemory(memory: TravelMemory, query: string): TravelMemory | undefined {
  const preference = memory.preference;
  const planning = planningRequest.test(query);
  const matchedInterests = preference.interests?.filter((interest) => matchesInterest(interest, query));
  const matchedDislikes = shoppingRequest.test(query)
    ? preference.dislikes?.filter((dislike) => dislike.trim().toLowerCase() !== "shopping")
    : preference.dislikes;
  const includePace = Boolean(preference.pace && planning);
  const includeTransport = Boolean(preference.transportPreference && (planning || transportRequest.test(query)));
  const includeDislikes = Boolean(matchedDislikes?.length && planning);
  if (!matchedInterests?.length && !includePace && !includeTransport && !includeDislikes) return undefined;
  return {
    ...memory,
    preference: {
      ...(includePace ? { pace: preference.pace } : {}),
      ...(includeTransport ? { transportPreference: preference.transportPreference } : {}),
      ...(preference.budgetLevel && planning ? { budgetLevel: preference.budgetLevel } : {}),
      ...(matchedInterests?.length ? { interests: matchedInterests } : {}),
      ...(includeDislikes ? { dislikes: matchedDislikes } : {}),
    },
  };
}

/** Selects a bounded set of request-relevant memories without invoking an LLM. */
export function retrieveRelevantMemories(input: { memories: TravelMemory[]; query: string; context?: TravelContext }): TravelMemory[] {
  const query = input.query.trim();
  if (!query) return [];
  return input.memories
    .flatMap((memory) => {
      const selected = selectMemory(memory, query);
      return selected ? [selected] : [];
    })
    .sort((left, right) => right.confidence - left.confidence || right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, MAX_RELEVANT_MEMORIES);
}

export function getRelevantMemoryContext(input: { memories: TravelMemory[]; query: string; context?: TravelContext }) {
  const memories = retrieveRelevantMemories(input);
  return { memories, formattedContext: buildMemoryContext(memories) };
}
