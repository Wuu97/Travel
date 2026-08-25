"use client";

import { useEffect, useState } from "react";
import { useConfirmation } from "../../shared/components/ConfirmDialog";
import { normalizeTravelMemory, type TravelMemory } from "../model";
import { MemoryCard } from "./MemoryCard";

type Props = { accessToken: string | null };

const headers = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

/** Reusable account-panel content for viewing and deleting the signed-in user's travel preferences. */
export function MemoryList({ accessToken }: Props) {
  const { confirm } = useConfirmation();
  const [memories, setMemories] = useState<TravelMemory[]>([]);
  const [loading, setLoading] = useState(Boolean(accessToken));
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!accessToken) {
      queueMicrotask(() => { if (active) { setMemories([]); setLoading(false); } });
      return () => { active = false; };
    }
    void fetch("/api/memory", { headers: headers(accessToken) })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({})) as { error?: unknown; memories?: unknown };
        if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "暂时无法加载旅行偏好");
        return Array.isArray(payload.memories) ? payload.memories.map(normalizeTravelMemory).filter((memory): memory is TravelMemory => Boolean(memory)) : [];
      })
      .then((next) => { if (active) { setMemories(next); setError(null); } })
      .catch((error: unknown) => { if (active) setError(error instanceof Error ? error.message : "暂时无法加载旅行偏好"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken]);

  const remove = async (memory: TravelMemory) => {
    if (!accessToken || !await confirm({ title: "确定删除这个旅行偏好吗？", description: "删除后 AI 将不再参考该偏好。" })) return;
    setDeletingId(memory.id);
    setError(null);
    try {
      const response = await fetch(`/api/memory/${encodeURIComponent(memory.id)}`, { method: "DELETE", headers: headers(accessToken) });
      const payload = await response.json().catch(() => ({})) as { error?: unknown };
      if (!response.ok) throw new Error(typeof payload.error === "string" ? payload.error : "暂时无法删除旅行偏好");
      setMemories((current) => current.filter((item) => item.id !== memory.id));
    } catch (error) {
      setError(error instanceof Error ? error.message : "暂时无法删除旅行偏好");
    } finally { setDeletingId(null); }
  };

  return <section className="memory-list" aria-labelledby="memory-list-title"><header><div><p id="memory-list-title">我的旅行偏好</p><small>AI 仅会在相关旅行问题中参考这些偏好。</small></div></header>{loading ? <p className="memory-state">正在加载旅行偏好…</p> : error ? <p className="memory-state memory-error" role="status">暂时无法加载旅行偏好</p> : memories.length ? <div className="memory-grid">{memories.map((memory) => <MemoryCard deleting={deletingId === memory.id} key={memory.id} memory={memory} onDelete={(item) => void remove(item)} />)}</div> : <p className="memory-state">暂无旅行偏好</p>}</section>;
}
