import type { TravelContext } from "../schemas/context";
import type { TravelMemory } from "../../memory/model";

export type RecommendationContext = {
  preferences?: { pace?: string; interests?: string[]; dislikes?: string[]; transport?: string };
  goals?: string[];
  constraints?: string[];
};

export type RecommendationScore = { itemId: string; score: number; reasons: string[] };

export type RecommendableTravelItem = { id?: string; name: string; category?: string; cuisine?: string[] };

export type RecommendationInput<T extends RecommendableTravelItem> = {
  items: T[];
  memoryContext?: RecommendationContext;
  travelContext?: TravelContext;
};

export type RankedTravelItems<T extends RecommendableTravelItem> = { sortedItems: T[]; scores: RecommendationScore[] };

/** Converts selected stored memories into a provider-independent recommendation context. */
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
