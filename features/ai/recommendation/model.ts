import type { TravelContext } from "../schemas/context";

export type RecommendationContext = {
  preferences?: { pace?: string; interests?: string[]; dislikes?: string[]; transport?: string };
  feedbackSignals?: { interests?: string[]; dislikes?: string[]; preferredTypes?: string[] };
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
