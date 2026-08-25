import type { TravelMemory } from "./model";

const paceLabels = { relaxed: "偏轻松", balanced: "均衡", intensive: "紧凑" } as const;
const transportLabels = { self_drive: "自驾", public_transport: "公共交通", mixed: "混合出行" } as const;
const budgetLabels = { budget: "经济", mid: "中等", premium: "高品质" } as const;
const preferenceLabels: Record<string, string> = { nature: "自然风景", food: "美食", photography: "摄影", culture: "历史文化", shopping: "购物型景点" };

const label = (value: string) => preferenceLabels[value.trim().toLowerCase()] || value;
const unique = (values: string[]) => [...new Set(values)];

/** Formats selected memory as compact, AI-readable preference facts rather than JSON. */
export function buildMemoryContext(memories: TravelMemory[]): string {
  const paces = unique(memories.flatMap((memory) => memory.preference.pace ? [paceLabels[memory.preference.pace]] : []));
  const transports = unique(memories.flatMap((memory) => memory.preference.transportPreference ? [transportLabels[memory.preference.transportPreference]] : []));
  const budgets = unique(memories.flatMap((memory) => memory.preference.budgetLevel ? [budgetLabels[memory.preference.budgetLevel]] : []));
  const interests = unique(memories.flatMap((memory) => memory.preference.interests?.map(label) ?? []));
  const dislikes = unique(memories.flatMap((memory) => memory.preference.dislikes?.map(label) ?? []));
  const lines = [
    ...paces.map((pace) => `- 行程节奏：${pace}`),
    ...transports.map((transport) => `- 交通偏好：${transport}`),
    ...budgets.map((budget) => `- 预算偏好：${budget}`),
    ...(interests.length ? [`- 喜欢：${interests.join("、")}`] : []),
    ...(dislikes.length ? [`- 不喜欢：${dislikes.join("、")}`] : []),
  ];
  return lines.length ? `用户旅行偏好：\n${lines.join("\n")}` : "";
}
