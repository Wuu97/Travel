import type { RecommendableTravelItem, RecommendationInput, RecommendationScore, RankedTravelItems } from "./model";

const interestTerms: Record<string, RegExp> = {
  nature: /(?:自然|湖|山|公园|森林|湿地|峡谷|江|河|海)/i,
  photography: /(?:摄影|拍照|观景|日出|日落|湖|山|古镇)/i,
  culture: /(?:历史|文化|博物馆|古迹|寺|祠|古镇)/i,
  food: /(?:餐厅|餐饮|美食|菜|小吃)/i,
};
const shopping = /(?:购物|商场|商业街|奥特莱斯)/i;
const relaxed = /(?:公园|湖|山|古镇|博物馆|湿地|寺)/i;
const selfDrive = /(?:自驾|山|湖|郊野|公园|森林|峡谷)/i;

const itemText = (item: RecommendableTravelItem) => [item.name, item.category, ...(item.cuisine ?? [])].filter(Boolean).join(" ");
const itemId = (item: RecommendableTravelItem, index: number) => item.id || `${item.name}-${index}`;

/** Ranks verified travel data with transparent, deterministic preference rules. */
export function rankTravelItems<T extends RecommendableTravelItem>({ items, memoryContext }: RecommendationInput<T>): RankedTravelItems<T> {
  const preferences = memoryContext?.preferences;
  const scored = items.map((item, index) => {
    const text = itemText(item); let score = 0; const reasons: string[] = [];
    for (const interest of preferences?.interests ?? []) {
      if (interestTerms[interest.trim().toLowerCase()]?.test(text)) { score += 2; reasons.push(`符合${interest === "nature" ? "自然风景" : interest === "photography" ? "摄影" : interest === "culture" ? "历史文化" : interest === "food" ? "美食" : interest}偏好`); }
    }
    if ((preferences?.dislikes ?? []).some((dislike) => dislike.trim().toLowerCase() === "shopping") && shopping.test(text)) { score -= 3; reasons.push("降低购物型景点优先级"); }
    if (preferences?.pace === "relaxed" && relaxed.test(text)) { score += 1; reasons.push("适合慢节奏游览"); }
    if (preferences?.transport === "self_drive" && selfDrive.test(text)) { score += 1; reasons.push("适合自驾衔接"); }
    return { item, index, score, reasons };
  });
  scored.sort((left, right) => right.score - left.score || left.index - right.index);
  const scores: RecommendationScore[] = scored.map(({ item, index, score, reasons }) => ({ itemId: itemId(item, index), score, reasons }));
  return { sortedItems: scored.map(({ item }) => item), scores };
}
