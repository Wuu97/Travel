"use client";

import type { TravelMemory } from "../model";
import { Button } from "../../shared/components/Button";

type Props = { deleting?: boolean; memory: TravelMemory; onDelete: (memory: TravelMemory) => void };

const paceLabels = { relaxed: "偏轻松", balanced: "均衡", intensive: "紧凑" } as const;
const transportLabels = { self_drive: "自驾", public_transport: "公共交通", mixed: "混合出行" } as const;
const budgetLabels = { budget: "经济", mid: "中等", premium: "高品质" } as const;
const labels: Record<string, string> = { nature: "自然风景", food: "美食", photography: "摄影", culture: "历史文化", shopping: "购物型景点" };
const display = (value: string) => labels[value.trim().toLowerCase()] || value;

export function MemoryCard({ deleting, memory, onDelete }: Props) {
  const preference = memory.preference;
  const facts = [
    preference.pace ? ["旅行节奏", paceLabels[preference.pace]] : undefined,
    preference.transportPreference ? ["交通偏好", transportLabels[preference.transportPreference]] : undefined,
    preference.budgetLevel ? ["预算偏好", budgetLabels[preference.budgetLevel]] : undefined,
    preference.interests?.length ? ["喜欢", preference.interests.map(display).join("、")] : undefined,
    preference.dislikes?.length ? ["不喜欢", preference.dislikes.map(display).join("、")] : undefined,
  ].filter((fact): fact is [string, string] => Boolean(fact));
  return <article className="memory-card"><div>{facts.map(([label, value]) => <p key={label}><small>{label}</small><strong>{value}</strong></p>)}</div><Button loading={deleting} type="button" variant="danger" onClick={() => onDelete(memory)}>删除</Button></article>;
}
