import type { FeedbackPreferenceSignal, TravelFeedbackEvent } from "./model";

const categorySignal = (category: string | undefined) => /(?:自然|湖|山|公园|森林|湿地|峡谷|江|河|海)/i.test(category ?? "") ? "nature" : /(?:购物|商场|商业街|奥特莱斯)/i.test(category ?? "") ? "shopping" : /(?:美食|餐厅|餐饮|菜|小吃|火锅|川菜|海鲜)/i.test(category ?? "") ? "food" : undefined;
const positive = new Set<TravelFeedbackEvent["type"]>(["add_to_trip", "keep_recommendation"]);
const negative = new Set<TravelFeedbackEvent["type"]>(["skip_recommendation", "remove_from_trip"]);

/** Requires repeated, non-conflicting behavior before emitting a weak recommendation signal. */
export function analyzeFeedbackSignals(events: TravelFeedbackEvent[]): FeedbackPreferenceSignal {
  const counts = new Map<string, { positive: number; negative: number }>();
  const preferredTypes = new Set<string>();
  for (const event of events) {
    const signal = categorySignal(event.category);
    if (!signal) continue;
    const count = counts.get(signal) ?? { positive: 0, negative: 0 };
    if (positive.has(event.type)) { count.positive += 1; preferredTypes.add(event.itemType); }
    if (negative.has(event.type)) count.negative += 1;
    counts.set(signal, count);
  }
  const interests: string[] = []; const dislikes: string[] = [];
  for (const [signal, count] of counts) {
    if (count.positive >= 2 && count.positive > count.negative) interests.push(signal);
    if (count.negative >= 2 && count.negative > count.positive) dislikes.push(signal);
  }
  return { ...(interests.length ? { interests } : {}), ...(dislikes.length ? { dislikes } : {}), ...(preferredTypes.size ? { preferredTypes: [...preferredTypes] } : {}) };
}
