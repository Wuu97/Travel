import type { TravelContext } from "../schemas/context";

export const ANSWER_BUDGET = { simple: 1200, guide: 2400, shortTrip: 3200, longTrip: 4000 } as const;

const longTrip = /(?:半个?月|(?:[7-9]|[1-9]\d+)\s*(?:天|日))/;
const shortTrip = /(?:周末|[一二三四五六两2-6]\s*(?:天|日)|[2-6]\s*(?:天|日)|路线|行程(?:安排)?|旅行计划|自驾|环线)/;
const guide = /(?:攻略|怎么玩|好吃|景点|自由行|推荐|值得去|游玩)/;
const simple = /(?:几月份|什么时候|天气|值得去吗|是什么|在哪里)/;

export function getAnswerBudget(input: { message: string; context?: TravelContext }): number {
  const message = input.message.trim();
  const tripDays = input.context?.trip?.days;
  if (tripDays && tripDays >= 4) return ANSWER_BUDGET.longTrip;
  if (tripDays && tripDays >= 2) return ANSWER_BUDGET.shortTrip;
  if (longTrip.test(message)) return ANSWER_BUDGET.longTrip;
  if (shortTrip.test(message)) return ANSWER_BUDGET.shortTrip;
  if (simple.test(message)) return ANSWER_BUDGET.simple;
  if (guide.test(message)) return ANSWER_BUDGET.guide;
  return ANSWER_BUDGET.guide;
}
