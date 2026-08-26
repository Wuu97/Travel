import type { RecommendationInput, RecommendationScore, RankedTravelItems, RecommendableTravelItem } from "./model";
import { diversifyRecommendations } from "./diversity";
import { buildRecommendationReasons } from "./explanation";

const foodTerms = /(?:美食|餐厅|餐饮|菜|小吃|火锅|川菜|海鲜|特色菜|老字号)/i;
const cuisineTerms = /(?:火锅|川菜|海鲜|小吃|特色菜|老字号)/i;

/** Ranks verified restaurants by food interest, cuisine relevance, and available rating. */
export function rankRestaurants<T extends RecommendableTravelItem & { rating?: number; averagePrice?: number }>({ items, memoryContext }: RecommendationInput<T>): RankedTravelItems<T> {
  const preferences = memoryContext?.preferences;
  const feedback = memoryContext?.feedbackSignals;
  const scored = items.map((item, index) => {
    const text = [item.name, item.category, ...(item.cuisine ?? [])].filter(Boolean).join(" "); let score = 0; const reasons: string[] = [];
    const explicitFood = (preferences?.interests ?? []).some((interest) => interest.trim().toLowerCase() === "food");
    const feedbackFood = feedback?.interests?.find((signal) => signal.value === "food");
    const prefersFood = explicitFood || Boolean(feedbackFood);
    if (prefersFood && foodTerms.test(text)) { score += explicitFood ? 2 : 0.5 * (feedbackFood?.confidence ?? 0); reasons.push(explicitFood ? "符合美食偏好" : "符合近期美食行为偏好"); }
    if (prefersFood && cuisineTerms.test(text)) { score += 1; reasons.push("具备特色菜系"); }
    if (prefersFood && typeof item.rating === "number" && Number.isFinite(item.rating)) { score += Math.min(item.rating, 5) / 10; reasons.push("参考已验证评分"); }
    return { item, index, score, reasons };
  });
  scored.sort((left, right) => right.score - left.score || left.index - right.index);
  const diversified = scored.some(({ score }) => score !== 0) ? diversifyRecommendations(scored, (item) => item.cuisine?.map((value) => value.trim().toLowerCase()).find(Boolean) ?? item.category?.trim().toLowerCase()) : scored;
  const scores: RecommendationScore[] = diversified.map(({ item, index, score, reasons }) => ({ itemId: item.id || `${item.name}-${index}`, score, reasons: buildRecommendationReasons(reasons) }));
  return { sortedItems: diversified.map(({ item }) => item), scores };
}
