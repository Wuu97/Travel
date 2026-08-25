import type { TravelMemory } from "../../memory/model";
import type { ExecutedTravelData } from "../tools/executor";
import { ANSWER_BUDGET, getAnswerBudget } from "../core/answerBudget";
import { CONTEXT_BUDGETS, MAX_PROMPT_PLACES, MAX_PROMPT_RESTAURANTS } from "./constants";
import type { ContextBudget, ContextBudgetInput } from "./model";

const paceLabels = { relaxed: "偏轻松", balanced: "均衡", intensive: "紧凑" } as const;
const transportLabels = { self_drive: "自驾", public_transport: "公共交通", mixed: "混合出行" } as const;
const budgetLabels = { budget: "经济", mid: "中等", premium: "高品质" } as const;
const preferenceLabels: Record<string, string> = { nature: "自然风景", food: "美食", photography: "摄影", culture: "历史文化", shopping: "购物型景点" };

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

function budgetKind(outputTokens: number): keyof typeof CONTEXT_BUDGETS {
  if (outputTokens === ANSWER_BUDGET.simple) return "simple";
  if (outputTokens === ANSWER_BUDGET.shortTrip) return "shortTrip";
  if (outputTokens === ANSWER_BUDGET.longTrip) return "longTrip";
  return "guide";
}

/** Resolves context limits from the existing answer-depth decision, rather than duplicating its heuristics. */
export function resolveContextBudget(input: ContextBudgetInput): ContextBudget {
  const outputTokens = input.complexity
    ? CONTEXT_BUDGETS[input.complexity].maxOutputTokens
    : getAnswerBudget({ message: input.query, context: input.tripDays ? { trip: { days: input.tripDays } } : undefined });
  const base = CONTEXT_BUDGETS[budgetKind(outputTokens)];
  return { ...base, maxOutputTokens: outputTokens };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function preferenceLabel(value: string): string {
  return preferenceLabels[value.trim().toLowerCase()] || value;
}

function memoryLines(memories: TravelMemory[]): string[] {
  const paces = unique(memories.flatMap(({ preference }) => preference.pace ? [paceLabels[preference.pace]] : []));
  const transports = unique(memories.flatMap(({ preference }) => preference.transportPreference ? [transportLabels[preference.transportPreference]] : []));
  const dislikes = unique(memories.flatMap(({ preference }) => preference.dislikes?.map(preferenceLabel) ?? []));
  const interests = unique(memories.flatMap(({ preference }) => preference.interests?.map(preferenceLabel) ?? []));
  const budgets = unique(memories.flatMap(({ preference }) => preference.budgetLevel ? [budgetLabels[preference.budgetLevel]] : []));
  return [
    ...paces.map((value) => `- 行程节奏：${value}`),
    ...transports.map((value) => `- 交通偏好：${value}`),
    ...(dislikes.length ? [`- 不喜欢：${dislikes.join("、")}`] : []),
    ...(interests.length ? [`- 喜欢：${interests.join("、")}`] : []),
    ...budgets.map((value) => `- 预算偏好：${value}`),
  ];
}

/** Keeps deterministic preference priorities while constraining the text sent to the model. */
export function trimMemoryContext(memories: TravelMemory[], maxTokens: number): string {
  const header = "用户旅行偏好：";
  const selected: string[] = [];
  for (const line of memoryLines(memories)) {
    const candidate = `${header}\n${[...selected, line].join("\n")}`;
    if (estimateTokenCount(candidate) > maxTokens) break;
    selected.push(line);
  }
  return selected.length ? `${header}\n${selected.join("\n")}` : "";
}

function compactText(value: string | undefined): string | undefined {
  return value ? value.slice(0, 160) : undefined;
}

type BudgetedToolResults = {
  places: Array<{ type: "place"; name: string; category?: string; area?: string; rating?: number; openingHours?: string[] }>;
  restaurants: Array<{ type: "restaurant"; name: string; cuisine?: string[]; area?: string; rating?: number; averagePrice?: number; priceText?: string; openingHours?: string[] }>;
  routes: Array<{ type: "route"; from: string; to: string; mode?: string; durationMinutes?: number; distanceMeters?: number; costText?: string }>;
};

/** Produces provider-safe prompt facts: top ten POIs/restaurants and all compact route facts. */
export function trimToolResults(data: ExecutedTravelData, maxTokens: number): BudgetedToolResults {
  const result: BudgetedToolResults = {
    places: data.places.slice(0, MAX_PROMPT_PLACES).map(({ name, category, area, rating, openingHours }) => ({ type: "place", name: compactText(name) ?? "", category: compactText(category), area: compactText(area), rating, openingHours })),
    restaurants: data.restaurants.slice(0, MAX_PROMPT_RESTAURANTS).map(({ name, cuisine, area, rating, averagePrice, priceText, openingHours }) => ({ type: "restaurant", name: compactText(name) ?? "", cuisine: cuisine?.map((item) => compactText(item) ?? ""), area: compactText(area), rating, averagePrice, priceText: compactText(priceText), openingHours })),
    routes: data.routes.map(({ from, to, mode, durationMinutes, distanceMeters, costText }) => ({ type: "route", from: compactText(from.name) ?? "", to: compactText(to.name) ?? "", mode, durationMinutes, distanceMeters, costText: compactText(costText) })),
  };
  while (estimateTokenCount(JSON.stringify(result)) > maxTokens && (result.restaurants.length || result.places.length)) {
    if (result.restaurants.length) result.restaurants.pop();
    else result.places.pop();
  }
  return result;
}

export function trimTextToTokenBudget(text: string, maxTokens: number): string {
  const maxCharacters = Math.max(0, maxTokens * 4);
  return text.length <= maxCharacters ? text : text.slice(0, maxCharacters).trimEnd();
}
