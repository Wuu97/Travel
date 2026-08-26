import type { FeedbackPreferenceSignal, TravelFeedbackEvent, WeightedPreferenceSignal } from "./model";

const categorySignal = (category: string | undefined) => /(?:自然|湖|山|公园|森林|湿地|峡谷|江|河|海)/i.test(category ?? "") ? "nature" : /(?:购物|商场|商业街|奥特莱斯)/i.test(category ?? "") ? "shopping" : /(?:美食|餐厅|餐饮|菜|小吃|火锅|川菜|海鲜)/i.test(category ?? "") ? "food" : undefined;
const positive = new Set<TravelFeedbackEvent["type"]>(["add_to_trip", "keep_recommendation"]);
const negative = new Set<TravelFeedbackEvent["type"]>(["skip_recommendation", "remove_from_trip"]);

const baseConfidence = (count: number) => count >= 4 ? 0.9 : count === 3 ? 0.7 : 0.5;
const decay = (timestamp: string, now: Date) => {
  const days = Math.max(0, (now.valueOf() - new Date(timestamp).valueOf()) / 86_400_000);
  return days <= 30 ? 1 : days <= 90 ? 0.7 : 0.4;
};

/** Requires repeated, non-conflicting behavior before emitting a decayed weak recommendation signal. */
export function analyzeFeedbackSignals(events: TravelFeedbackEvent[], now = new Date()): FeedbackPreferenceSignal {
  const counts = new Map<string, { positive: TravelFeedbackEvent[]; negative: TravelFeedbackEvent[] }>();
  const preferredTypes = new Set<string>();
  for (const event of events) {
    const signal = categorySignal(event.category);
    if (!signal) continue;
    const count = counts.get(signal) ?? { positive: [], negative: [] };
    if (positive.has(event.type)) { count.positive.push(event); preferredTypes.add(event.itemType); }
    if (negative.has(event.type)) count.negative.push(event);
    counts.set(signal, count);
  }
  const interests: WeightedPreferenceSignal[] = []; const dislikes: WeightedPreferenceSignal[] = [];
  for (const [signal, count] of counts) {
    const netPositive = count.positive.length - count.negative.length;
    const netNegative = count.negative.length - count.positive.length;
    if (netPositive >= 2) interests.push({ value: signal, confidence: baseConfidence(netPositive) * (count.positive.reduce((total, event) => total + decay(event.timestamp, now), 0) / count.positive.length) });
    if (netNegative >= 2) dislikes.push({ value: signal, confidence: baseConfidence(netNegative) * (count.negative.reduce((total, event) => total + decay(event.timestamp, now), 0) / count.negative.length) });
  }
  return { ...(interests.length ? { interests } : {}), ...(dislikes.length ? { dislikes } : {}), ...(preferredTypes.size ? { preferredTypes: [...preferredTypes] } : {}) };
}
