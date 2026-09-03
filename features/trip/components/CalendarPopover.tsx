"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton } from "../../shared/components/IconButton";

type Marker = { kind: "rest" | "work"; label?: string };
type View = "days" | "months" | "years";

type Props = {
  ariaLabel: string;
  disabled?: (value: string) => boolean;
  inRange?: (value: string) => boolean;
  month: string;
  onClose: () => void;
  onDateHover?: (value: string) => void;
  onDateSelect: (value: string) => void;
  onMonthChange: (month: string) => void;
  onPointerLeave?: () => void;
  selected?: (value: string) => boolean;
};

export const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const asDate = (value: string) => new Date(`${value}T00:00:00`);
const daysForMonth = (month: string) => {
  const first = asDate(`${month}-01`);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
};

/** Shared navigation, holiday and date-grid layer. Selection semantics stay with each picker. */
export function CalendarPopover({ ariaLabel, disabled = () => false, inRange = () => false, month, onClose, onDateHover, onDateSelect, onMonthChange, onPointerLeave, selected = () => false }: Props) {
  const [view, setView] = useState<View>("days");
  const [markers, setMarkers] = useState<Record<string, Marker>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const [year, monthNumber] = month.split("-").map(Number);
  const today = dateValue(new Date());

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/holidays?month=${month}&v=4`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ markers?: Record<string, Marker> }> : { markers: {} })
      .then((data) => setMarkers(data.markers || {}))
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setMarkers({}); });
    return () => controller.abort();
  }, [month]);

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) onClose(); };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [onClose]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const moveMonth = (offset: number) => { const next = asDate(`${month}-01`); next.setMonth(next.getMonth() + offset); onMonthChange(dateValue(next).slice(0, 7)); };
  return <div className="return-date-calendar" ref={rootRef} role="dialog" aria-label={ariaLabel}>
    <div className="calendar-toolbar"><IconButton aria-label="上个月" icon="chevronLeft" size="sm" variant="ghost" onClick={() => moveMonth(-1)} /><div><button type="button" onClick={() => setView("years")}>{year} 年</button><button type="button" onClick={() => setView("months")}>{monthNumber} 月</button></div><IconButton aria-label="下个月" icon="chevronRight" size="sm" variant="ghost" onClick={() => moveMonth(1)} /><button className="calendar-today" type="button" onClick={() => { onMonthChange(today.slice(0, 7)); setView("days"); }}>今天</button></div>
    {view === "days" && <><div className="return-calendar-weekdays">{["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>{day}</span>)}</div><div className="return-calendar-days" onMouseLeave={onPointerLeave}>{daysForMonth(month).map((date) => { const value = dateValue(date); const marker = markers[value]; const isDisabled = disabled(value); const weekend = !marker && value.slice(0, 7) === month && (date.getDay() === 0 || date.getDay() === 6); const label = marker?.kind === "work" ? "班" : marker?.label; return <button className={`${value.slice(0, 7) !== month ? "outside-month " : ""}${selected(value) ? "selected " : ""}${inRange(value) ? "in-range " : ""}${value === today ? "today " : ""}${marker ? `holiday-${marker.kind} ` : ""}${weekend ? "weekend" : ""}`} disabled={isDisabled} key={value} title={label || undefined} type="button" onClick={() => onDateSelect(value)} onMouseEnter={() => { if (!isDisabled) onDateHover?.(value); }}>{label && <span className="calendar-holiday-marker" aria-hidden="true">{label}</span>}<span>{value === today ? "今天" : date.getDate()}</span></button>; })}</div></>}
    {view === "months" && <div className="calendar-choice-grid">{Array.from({ length: 12 }, (_, index) => { const value = index + 1; return <button className={value === monthNumber ? "selected" : ""} key={value} type="button" onClick={() => { onMonthChange(`${year}-${String(value).padStart(2, "0")}`); setView("days"); }}>{value} 月</button>; })}</div>}
    {view === "years" && <div className="calendar-choice-grid">{Array.from({ length: 12 }, (_, index) => { const value = year - 5 + index; return <button key={value} type="button" onClick={() => { onMonthChange(`${value}-${String(monthNumber).padStart(2, "0")}`); setView("days"); }}>{value} 年</button>; })}</div>}
  </div>;
}
