import type { CSSProperties, RefObject } from "react";
import type { ItineraryItem } from "../model";
import { typeColors } from "../utils";

type InlineEdit = { id: string; field: "title" | "note"; value: string } | null;
type Props = { index: number; inlineEdit: InlineEdit; inlineRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>; isMenuOpen: boolean; menuRef: RefObject<HTMLDivElement | null>; onChangeInline: (edit: InlineEdit) => void; onCopy: (plan: ItineraryItem) => void; onDelete: (id: string) => void; onEdit: (plan: ItineraryItem) => void; onSaveInline: () => void; onToggleMenu: () => void; plan: ItineraryItem };

export function ItineraryCard({ index, inlineEdit, inlineRef, isMenuOpen, menuRef, onChangeInline, onCopy, onDelete, onEdit, onSaveInline, onToggleMenu, plan }: Props) {
  const style = typeColors[plan.type];
  const displayTime = plan.time || ["09:30", "11:30", "14:30"][index] || "待定";
  const editingTitle = inlineEdit?.id === plan.id && inlineEdit.field === "title";
  const editingNote = inlineEdit?.id === plan.id && inlineEdit.field === "note";
  return <article className="itinerary-card" data-plan-id={plan.id} style={{ "--type-color": style.color, "--type-tint": style.tint, zIndex: isMenuOpen ? 2 : 1 } as CSSProperties}>
    <time style={{ fontSize: displayTime === "待定" ? 9 : 12 }}>{displayTime}</time><span className="type-tag" style={{ fontSize: 12 }}>{plan.type}</span>
    <div className="plan-content">
      {editingTitle ? <input className="inline-plan-input" ref={inlineRef} value={inlineEdit.value} aria-label="行程名称" onChange={(event) => onChangeInline({ ...inlineEdit, value: event.target.value })} onBlur={onSaveInline} onKeyDown={(event) => { if (event.key === "Enter") onSaveInline(); if (event.key === "Escape") onChangeInline(null); }} /> : <h4><button type="button" className="inline-readable" title="点击编辑行程名称" onClick={() => onChangeInline({ id: plan.id, field: "title", value: plan.title })}>{plan.title}<span aria-hidden="true">✎</span></button></h4>}
      {editingNote ? <textarea className="inline-plan-note" ref={inlineRef} rows={2} value={inlineEdit.value} aria-label="行程备注" placeholder="添加备注" onChange={(event) => onChangeInline({ ...inlineEdit, value: event.target.value })} onBlur={onSaveInline} onKeyDown={(event) => { if (event.key === "Escape") onChangeInline(null); if ((event.metaKey || event.ctrlKey) && event.key === "Enter") onSaveInline(); }} /> : <p><button type="button" className="inline-readable" title="点击编辑备注" onClick={() => onChangeInline({ id: plan.id, field: "note", value: plan.note || "" })}>{plan.note || "暂无备注"}<span aria-hidden="true">✎</span></button></p>}
    </div>
    <small className="plan-creator">{plan.creator === "AI" ? "AI 规划" : `${plan.creator || "你"} 添加`}</small>
    <div ref={isMenuOpen ? menuRef : null} className={`plan-menu${isMenuOpen ? " is-open" : ""}`} style={isMenuOpen ? { opacity: 1 } : undefined}><button className="plan-menu-trigger" aria-label={`更多操作：${plan.title}`} title="更多操作" type="button" onClick={onToggleMenu}>⋮</button>{isMenuOpen && <div className="plan-menu-popover"><button onClick={() => onEdit(plan)}>编辑</button><button onClick={() => onCopy(plan)}>复制行程</button><button className="danger" onClick={() => onDelete(plan.id)}>删除</button></div>}</div>
  </article>;
}
