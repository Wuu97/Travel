import type { TravelMemory } from "../../memory/model";
import type { RecommendationContext } from "./model";

/** Converts selected stored memories into the unchanged provider-neutral recommendation context. */
export function createRecommendationContext(memories: TravelMemory[], query: string): RecommendationContext {
  const preferences = {
    pace: memories.find((memory) => memory.preference.pace)?.preference.pace,
    transport: memories.find((memory) => memory.preference.transportPreference)?.preference.transportPreference,
    interests: [...new Set(memories.flatMap((memory) => memory.preference.interests ?? []))],
    dislikes: [...new Set(memories.flatMap((memory) => memory.preference.dislikes ?? []))],
  };
  const constraints = /(?:不要|不想|避免).{0,8}购物/.test(query) ? ["avoid_shopping"] : [];
  return { preferences, ...(constraints.length ? { constraints } : {}) };
}
