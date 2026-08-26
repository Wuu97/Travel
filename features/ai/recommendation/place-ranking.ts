import type { RecommendationInput, RecommendationScore, RankedTravelItems, RecommendableTravelItem } from "./model";
import { diversifyRecommendations } from "./diversity";
import { buildRecommendationReasons } from "./explanation";

const interestTerms: Record<string, RegExp> = { nature: /(?:自然|湖|山|公园|森林|湿地|峡谷|江|河|海)/i, photography: /(?:摄影|拍照|观景|日出|日落|湖|山|古镇)/i, culture: /(?:历史|文化|博物馆|古迹|寺|祠|古镇)/i };
const shopping = /(?:购物|商场|商业街|奥特莱斯)/i;
const relaxed = /(?:公园|湖|山|古镇|博物馆|湿地|寺)/i;
const selfDrive = /(?:自驾|山|湖|郊野|公园|森林|峡谷)/i;

/** Ranks verified places by interest, shopping avoidance, pace, and transport preference. */
export function rankPlaces<T extends RecommendableTravelItem>({ items, memoryContext }: RecommendationInput<T>): RankedTravelItems<T> {
  const preferences = memoryContext?.preferences;
  const feedback = memoryContext?.feedbackSignals;
  const scored = items.map((item, index) => {
    const text = [item.name, item.category].filter(Boolean).join(" "); let score = 0; const reasons: string[] = [];
    for (const interest of preferences?.interests ?? []) if (interestTerms[interest.trim().toLowerCase()]?.test(text)) { score += 2; reasons.push(`符合${interest === "nature" ? "自然风景" : interest === "photography" ? "摄影" : "历史文化"}偏好`); }
    for (const interest of feedback?.interests ?? []) if (!(preferences?.interests ?? []).includes(interest.value) && interestTerms[interest.value]?.test(text)) { score += 0.5 * interest.confidence; reasons.push("符合近期行为偏好"); }
    if ((preferences?.dislikes ?? []).some((dislike) => dislike.trim().toLowerCase() === "shopping") && shopping.test(text)) { score -= 3; reasons.push("降低购物型景点优先级"); }
    else if (!(preferences?.interests ?? []).includes("shopping") && feedback?.dislikes?.find((signal) => signal.value === "shopping") && shopping.test(text)) { score -= feedback.dislikes.find((signal) => signal.value === "shopping")!.confidence; reasons.push("降低近期跳过的购物推荐优先级"); }
    if (preferences?.pace === "relaxed" && relaxed.test(text)) { score += 1; reasons.push("适合慢节奏游览"); }
    if (preferences?.transport === "self_drive" && selfDrive.test(text)) { score += 1; reasons.push("适合自驾衔接"); }
    return { item, index, score, reasons };
  });
  scored.sort((left, right) => right.score - left.score || left.index - right.index);
  const diversified = scored.some(({ score }) => score !== 0) ? diversifyRecommendations(scored, (item) => item.category?.trim().toLowerCase()) : scored;
  const scores: RecommendationScore[] = diversified.map(({ item, index, score, reasons }) => ({ itemId: item.id || `${item.name}-${index}`, score, reasons: buildRecommendationReasons(reasons) }));
  return { sortedItems: diversified.map(({ item }) => item), scores };
}
