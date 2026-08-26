import { useState, type CSSProperties, type RefObject } from "react";
import type { ItineraryItem } from "../model";
import { typeColors } from "../utils";
import { useTripCapabilities } from "./TripCapabilities";

type InlineEdit = { id: string; field: "title" | "note" | "time" | "type"; value: string } | null;
type Props = { index: number; inlineEdit: InlineEdit; inlineRef: RefObject<HTMLInputElement | null>; textareaRef: RefObject<HTMLTextAreaElement | null>; isMenuOpen: boolean; menuRef: RefObject<HTMLDivElement | null>; onChangeInline: (edit: InlineEdit) => void; onCopy: (plan: ItineraryItem) => void; onDelete: (id: string) => void; onEdit: (plan: ItineraryItem) => void; onSaveInline: () => void; onToggleMenu: () => void; onViewExpenses: () => void; plan: ItineraryItem; expenseSummary: { estimated: number; actual: number } | null };
const itineraryTypes: ItineraryItem["type"][] = ["景点", "餐饮", "活动", "交通", "住宿", "购物", "其他"];

export function ItineraryCard({ expenseSummary, index, inlineEdit, inlineRef, textareaRef, isMenuOpen, menuRef, onChangeInline, onCopy, onDelete, onSaveInline, onToggleMenu, onViewExpenses, plan }: Props) {
  const { canEditTrip } = useTripCapabilities();
  const [opensUp, setOpensUp] = useState(false);
  const displayTime = plan.time || ["09:30", "11:30", "14:30"][index] || "待定";
  const editingTitle = inlineEdit?.id === plan.id && inlineEdit.field === "title";
  const editingNote = inlineEdit?.id === plan.id && inlineEdit.field === "note";
  const editingTime = inlineEdit?.id === plan.id && inlineEdit.field === "time";
  const editingType = inlineEdit?.id === plan.id && inlineEdit.field === "type";
  const selectedType = editingType ? inlineEdit.value as ItineraryItem["type"] : plan.type;
  const style = typeColors[selectedType];
  const placeFacts = [
    ...(plan.place?.rating === undefined ? [] : [`高德评分 ${plan.place.rating.toFixed(1)}`]),
    ...(plan.place?.averageCost === undefined ? [] : [`人均 ¥${plan.place.averageCost}`]),
    ...(plan.place?.openingHours ? [`营业 ${plan.place.openingHours}`] : []),
  ];
  return <article className="itinerary-card" data-plan-id={plan.id} draggable={canEditTrip} onDragStart={canEditTrip ? (event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-tuyu-itinerary", plan.id); const preview = document.createElement("div"); const tag = document.createElement("span"); const title = document.createElement("strong"); preview.className = "itinerary-drag-preview"; preview.style.setProperty("--type-color", style.color); preview.style.setProperty("--type-tint", style.tint); tag.textContent = plan.type; title.textContent = plan.title; preview.append(tag, title); document.body.appendChild(preview); event.dataTransfer.setDragImage(preview, 24, 18); window.setTimeout(() => preview.remove(), 0); } : undefined} style={{ "--type-color": style.color, "--type-tint": style.tint, zIndex: isMenuOpen ? 2 : 1 } as CSSProperties}>
    {canEditTrip && editingTime ? <input className="inline-time-input" ref={inlineRef} type="time" value={inlineEdit.value} aria-label="行程时间" onChange={(event) => onChangeInline({ ...inlineEdit, value: event.target.value })} onBlur={onSaveInline} onKeyDown={(event) => { if (event.key === "Enter") onSaveInline(); if (event.key === "Escape") onChangeInline(null); }} /> : <time style={{ fontSize: displayTime === "待定" ? 9 : 12 }}>{canEditTrip ? <button type="button" className="inline-readable" title="点击编辑时间" onClick={() => onChangeInline({ id: plan.id, field: "time", value: plan.time || "" })}>{displayTime}<span aria-hidden="true">✎</span></button> : displayTime}</time>}
    {canEditTrip ? <select className="type-tag inline-type-select" value={editingType ? inlineEdit.value : plan.type} aria-label="行程类型" onBlur={onSaveInline} onChange={(event) => onChangeInline({ id: plan.id, field: "type", value: event.target.value })} onKeyDown={(event) => { if (event.key === "Escape") onChangeInline(null); }}>{itineraryTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select> : <span className="type-tag">{plan.type}</span>}
    <div className="plan-content">
      {canEditTrip && editingTitle ? <input className="inline-plan-input" ref={inlineRef} value={inlineEdit.value} aria-label="行程名称" onChange={(event) => onChangeInline({ ...inlineEdit, value: event.target.value })} onBlur={onSaveInline} onKeyDown={(event) => { if (event.key === "Enter") onSaveInline(); if (event.key === "Escape") onChangeInline(null); }} /> : <h4>{canEditTrip ? <button type="button" className="inline-readable" title="点击编辑行程名称" onClick={() => onChangeInline({ id: plan.id, field: "title", value: plan.title })}>{plan.title}<span aria-hidden="true">✎</span></button> : plan.title}</h4>}
      {canEditTrip && editingNote ? <textarea className="inline-plan-note" ref={textareaRef} rows={2} value={inlineEdit.value} aria-label="行程备注" placeholder="添加备注" onChange={(event) => onChangeInline({ ...inlineEdit, value: event.target.value })} onBlur={onSaveInline} onKeyDown={(event) => { if (event.key === "Escape") onChangeInline(null); if ((event.metaKey || event.ctrlKey) && event.key === "Enter") onSaveInline(); }} /> : <p>{canEditTrip ? <button type="button" className="inline-readable" title="点击编辑备注" onClick={() => onChangeInline({ id: plan.id, field: "note", value: plan.note || "" })}>{plan.note || "暂无备注"}<span aria-hidden="true">✎</span></button> : plan.note || "暂无备注"}</p>}
      {placeFacts.length > 0 && <div className="place-facts" aria-label="高德地点信息">{placeFacts.map((fact) => <span key={fact}>{fact}</span>)}</div>}
      {expenseSummary && <button type="button" className="inline-readable" onClick={onViewExpenses}>预计 ¥{expenseSummary.estimated} · 实际 ¥{expenseSummary.actual}</button>}
    </div>
    <small className="plan-creator">{plan.creator === "AI" ? "AI 规划" : `${plan.creator || "你"} 添加`}</small>
    {canEditTrip && <div ref={isMenuOpen ? menuRef : null} className={`plan-menu${isMenuOpen ? " is-open" : ""}`} style={isMenuOpen ? { opacity: 1 } : undefined}><button className="plan-menu-trigger" aria-label={`更多操作：${plan.title}`} title="更多操作" type="button" onClick={(event) => { const timelineList = event.currentTarget.closest(".timeline-list"); setOpensUp(Boolean(timelineList && timelineList.getBoundingClientRect().bottom - event.currentTarget.getBoundingClientRect().bottom < 112)); onToggleMenu(); }}>⋮</button>{isMenuOpen && <div className={`plan-menu-popover${opensUp ? " opens-up" : ""}`}><button onClick={() => onCopy(plan)}>复制行程</button><button className="danger" onClick={() => onDelete(plan.id)}>删除</button></div>}</div>}
  </article>;
}
