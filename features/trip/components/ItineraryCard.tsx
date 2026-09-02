import { type CSSProperties, type RefObject, useEffect, useRef, useState } from "react";
import { tripCategories, type ItineraryItem } from "../model";
import { CustomSelect } from "../../shared/components/CustomSelect";
import { getTimeValidationMessage } from "../hooks/useInlinePlanEditor";
import { typeColors } from "../utils";
import { useTripPresentation } from "./TripCapabilities";

type InlineEdit = { id: string; field: "title" | "note" | "time" | "type"; value: string } | null;
type Props = { index: number; inlineEdit: InlineEdit; inlineRef: RefObject<HTMLInputElement | null>; textareaRef: RefObject<HTMLTextAreaElement | null>; onChangeInline: (edit: InlineEdit) => void; onDelete: (id: string) => void; onSaveInline: () => void; plan: ItineraryItem };
const splitTime = (value: string) => {
  const [hour = "", minute = ""] = value.trim().split(":", 2);
  return { hour, minute };
};
const numericTimePart = (value: string) => value.replace(/\D/g, "").slice(0, 2);

function TimeEditor({ edit, inputRef, onCancel, onChange, onSave }: { edit: Exclude<InlineEdit, null>; inputRef: RefObject<HTMLInputElement | null>; onCancel: () => void; onChange: (edit: Exclude<InlineEdit, null>) => void; onSave: () => void }) {
  const minuteInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const { hour, minute } = splitTime(edit.value);
  const update = (value: string) => { setError(null); onChange({ ...edit, value }); };
  const commit = () => { const message = getTimeValidationMessage(edit.value); if (message) { setError(message); return; } onSave(); };
  const pasteTime = (value: string) => {
    if (!value.includes(":")) return false;
    const parts = splitTime(value);
    update(`${numericTimePart(parts.hour)}:${numericTimePart(parts.minute)}`);
    minuteInputRef.current?.focus();
    minuteInputRef.current?.select();
    return true;
  };
  return <div className={`inline-time-editor${error ? " is-invalid" : ""}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) commit(); }}><div className="inline-time-fields"><input ref={inputRef} type="text" inputMode="numeric" maxLength={2} value={hour} aria-label="小时" aria-invalid={Boolean(error)} placeholder="HH" onPaste={(event) => { if (pasteTime(event.clipboardData.getData("text"))) event.preventDefault(); }} onChange={(event) => { const nextHour = numericTimePart(event.target.value); update(`${nextHour}:${minute}`); if (nextHour.length === 2) { minuteInputRef.current?.focus(); minuteInputRef.current?.select(); } }} onKeyDown={(event) => { if (event.nativeEvent.isComposing) return; const atEnd = event.currentTarget.selectionStart === hour.length && event.currentTarget.selectionEnd === hour.length; const allSelected = hour.length > 0 && event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === hour.length; if (event.key === "ArrowRight" && (atEnd || allSelected)) { event.preventDefault(); minuteInputRef.current?.focus(); minuteInputRef.current?.setSelectionRange(0, 0); return; } if (event.key === "Enter") commit(); if (event.key === "Escape") onCancel(); }} /><span aria-hidden="true">:</span><input ref={minuteInputRef} type="text" inputMode="numeric" maxLength={2} value={minute} aria-label="分钟" aria-invalid={Boolean(error)} placeholder="mm" onPaste={(event) => { if (pasteTime(event.clipboardData.getData("text"))) event.preventDefault(); }} onChange={(event) => update(`${hour}:${numericTimePart(event.target.value)}`)} onKeyDown={(event) => { if (event.nativeEvent.isComposing) return; const atStart = event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === 0; const allSelected = minute.length > 0 && event.currentTarget.selectionStart === 0 && event.currentTarget.selectionEnd === minute.length; if (event.key === "ArrowLeft" && (atStart || allSelected)) { event.preventDefault(); inputRef.current?.focus(); inputRef.current?.setSelectionRange(hour.length, hour.length); return; } if (event.key === "Backspace" && !minute) inputRef.current?.focus(); if (event.key === "Enter") commit(); if (event.key === "Escape") onCancel(); }} /></div>{error && <span className="inline-time-error" role="alert">{error}</span>}</div>;
}

export function ItineraryCard({ index, inlineEdit, inlineRef, textareaRef, onChangeInline, onDelete, onSaveInline, plan }: Props) {
  const { canDeleteTrip, editableStructure, interactionEnabled, permissionStatus } = useTripPresentation();
  const permissionsPending = permissionStatus === "loading";
  const displayTime = plan.time || ["09:30", "11:30", "14:30"][index] || "待定";
  const editingTitle = inlineEdit?.id === plan.id && inlineEdit.field === "title";
  const editingNote = inlineEdit?.id === plan.id && inlineEdit.field === "note";
  const editingTime = inlineEdit?.id === plan.id && inlineEdit.field === "time";
  const editingType = inlineEdit?.id === plan.id && inlineEdit.field === "type";
  const selectedType = editingType ? inlineEdit.value as ItineraryItem["type"] : plan.type;
  const style = typeColors[selectedType];
  const titleEditorWidth = `${Math.min(Math.max(plan.title.length + 2, 6), 18)}em`;
  useEffect(() => {
    if (inlineEdit?.id === plan.id && inlineEdit.field === "type") onSaveInline();
  }, [inlineEdit, onSaveInline, plan.id]);
  const resizeNote = (input: HTMLTextAreaElement) => {
    const minHeight = 28;
    const maxHeight = 96;
    const borderHeight = 2;
    input.style.height = "0px";
    const nextHeight = Math.max(minHeight, Math.min(input.scrollHeight + borderHeight, maxHeight));
    input.style.height = `${nextHeight}px`;
    input.style.overflowY = input.scrollHeight + borderHeight > maxHeight ? "auto" : "hidden";
  };
  // These are reference attributes of a place, not this trip's budget or
  // actual spending. Financial records stay exclusively in the ledger.
  const placeFacts = [
    ...(plan.place?.rating === undefined ? [] : [`★ ${plan.place.rating.toFixed(1)}`]),
    ...(plan.place?.averageCost === undefined ? [] : [`¥${plan.place.averageCost}/人`]),
    ...(plan.place?.openingHours ? [plan.place.openingHours.replaceAll("-", "–")] : []),
  ];
  return <article className="itinerary-card" data-plan-id={plan.id} draggable={interactionEnabled} onDragStart={interactionEnabled ? (event) => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("application/x-tuyu-itinerary", plan.id); const preview = document.createElement("div"); const tag = document.createElement("span"); const title = document.createElement("strong"); preview.className = "itinerary-drag-preview"; preview.style.setProperty("--type-color", style.color); preview.style.setProperty("--type-tint", style.tint); tag.textContent = plan.type; title.textContent = plan.title; preview.append(tag, title); document.body.appendChild(preview); event.dataTransfer.setDragImage(preview, 24, 18); window.setTimeout(() => preview.remove(), 0); } : undefined} style={{ "--type-color": style.color, "--type-tint": style.tint } as CSSProperties}>
    {interactionEnabled && editingTime ? <TimeEditor edit={inlineEdit!} inputRef={inlineRef} onCancel={() => onChangeInline(null)} onChange={onChangeInline} onSave={onSaveInline} /> : <time style={{ fontSize: displayTime === "待定" ? 9 : 12 }}>{editableStructure ? <button aria-disabled={permissionsPending} type="button" className="inline-readable" title="点击编辑时间" onClick={() => { if (interactionEnabled) onChangeInline({ id: plan.id, field: "time", value: plan.time || "" }); }}>{displayTime}<span aria-hidden="true">✎</span></button> : displayTime}</time>}
    {editableStructure ? <CustomSelect ariaLabel="行程类型" disabled={!interactionEnabled} menuClassName="itinerary-type-menu" options={tripCategories.map((value) => ({ value, label: value }))} value={editingType ? inlineEdit.value : plan.type} onChange={(value) => { if (interactionEnabled) onChangeInline({ id: plan.id, field: "type", value }); }} renderTrigger={({ selectedOption, triggerProps, triggerRef }) => <button {...triggerProps} className="type-tag inline-type-select" ref={triggerRef}>{selectedOption?.label || plan.type}</button>} /> : <span className="type-tag">{plan.type}</span>}
    <div className="plan-content">
      <div className="plan-title-row">{interactionEnabled && editingTitle ? <input className="inline-plan-input" ref={inlineRef} style={{ width: titleEditorWidth }} value={inlineEdit.value} aria-label="行程名称" onChange={(event) => onChangeInline({ ...inlineEdit, value: event.target.value })} onBlur={onSaveInline} onKeyDown={(event) => { if (event.nativeEvent.isComposing) return; if (event.key === "Enter") onSaveInline(); if (event.key === "Escape") onChangeInline(null); }} /> : <h4>{editableStructure ? <button aria-disabled={permissionsPending} type="button" className="inline-readable" title="点击编辑行程名称" onClick={() => { if (interactionEnabled) onChangeInline({ id: plan.id, field: "title", value: plan.title }); }}>{plan.title}<span aria-hidden="true">✎</span></button> : plan.title}</h4>}{placeFacts.length > 0 && <div className="place-facts" aria-label="地点参考信息">{placeFacts.map((fact) => <span key={fact}>{fact}</span>)}</div>}{interactionEnabled && !editingTitle && !editingNote && !plan.note && <button className="plan-add-note" type="button" onClick={() => onChangeInline({ id: plan.id, field: "note", value: "" })}>＋ 添加备注</button>}</div>
      {interactionEnabled && editingNote ? <textarea className="inline-plan-note" ref={textareaRef} rows={1} value={inlineEdit.value} aria-label="行程备注" placeholder="添加备注…" onChange={(event) => onChangeInline({ ...inlineEdit, value: event.target.value })} onInput={(event) => resizeNote(event.currentTarget)} onFocus={(event) => resizeNote(event.currentTarget)} onBlur={onSaveInline} onKeyDown={(event) => { if (event.nativeEvent.isComposing) return; if (event.key === "Escape") { onChangeInline(null); return; } if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSaveInline(); } }} /> : plan.note ? <p>{editableStructure ? <button aria-disabled={permissionsPending} type="button" className="inline-readable" title="点击编辑备注" onClick={() => { if (interactionEnabled) onChangeInline({ id: plan.id, field: "note", value: plan.note ?? "" }); }}>{plan.note}<span aria-hidden="true">✎</span></button> : plan.note}</p> : null}
    </div>
    {plan.creator && <small className="plan-creator">{plan.creator === "AI" ? "AI 规划" : `${plan.creator} 添加`}</small>}
    {interactionEnabled && canDeleteTrip && <button className="plan-delete" type="button" aria-label={`删除${plan.title}`} title="删除行程" onClick={() => onDelete(plan.id)}>×</button>}
  </article>;
}
