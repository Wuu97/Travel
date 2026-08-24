"use client";

import { useEffect, useRef, useState } from "react";

type Marker = { kind: "rest" | "work"; label?: string };
type Target = "start" | "end";
type View = "days" | "months" | "years";
type Props = { endDate: string; onChange: (dates: { startDate: string; endDate: string }) => void; startDate: string; className?: string; startLabel?: string; endLabel?: string; startError?: string; endError?: string };

const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const asDate = (value: string) => new Date(`${value}T00:00:00`);
const daysForMonth = (month: string) => {
  const first = asDate(`${month}-01`);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => { const day = new Date(start); day.setDate(start.getDate() + index); return day; });
};

/** Shared custom date-range picker: holiday markers, range validation, and return-date handoff live here. */
export function CustomDateRangePicker({ endDate, onChange, startDate, className = "", startLabel = "出发", endLabel = "返程", startError, endError }: Props) {
  const [target, setTarget] = useState<Target>("start");
  const [month, setMonth] = useState((startDate || dateValue(new Date())).slice(0, 7));
  const [view, setView] = useState<View>("days");
  const [open, setOpen] = useState(false);
  const [hoveredEndDate, setHoveredEndDate] = useState("");
  const [markers, setMarkers] = useState<Record<string, Marker>>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const [year, monthNumber] = month.split("-").map(Number);
  const today = dateValue(new Date());

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    fetch(`/api/holidays?month=${month}&v=4`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ markers?: Record<string, Marker> }> : { markers: {} })
      .then((data) => setMarkers(data.markers || {}))
      .catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) setMarkers({}); });
    return () => controller.abort();
  }, [month, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) { setOpen(false); setHoveredEndDate(""); }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);

  const openFor = (next: Target) => { setTarget(next); setHoveredEndDate(""); setMonth(((next === "start" ? startDate : endDate) || startDate || today).slice(0, 7)); setView("days"); setOpen(true); };
  const selectDate = (value: string) => {
    if (target === "end") { onChange({ startDate, endDate: value }); setHoveredEndDate(""); setOpen(false); return; }
    const chooseEnd = !endDate || value > endDate;
    onChange({ startDate: value, endDate: chooseEnd && endDate ? value : endDate });
    setMonth(value.slice(0, 7));
    setHoveredEndDate("");
    setTarget("end");
    setOpen(chooseEnd);
  };
  const moveMonth = (offset: number) => { const next = asDate(`${month}-01`); next.setMonth(next.getMonth() + offset); setMonth(dateValue(next).slice(0, 7)); };
  const [startYear, startMonth] = startDate ? startDate.slice(0, 7).split("-").map(Number) : [0, 0];

  return <div className={`custom-date-range ${className}`} data-calendar-target={target} ref={rootRef}>
    <div className="date-popover-fields"><label>{startLabel}<input className={startError ? "input-error" : ""} placeholder={`选择${startLabel}`} readOnly value={startDate.replaceAll("-", "/")} onClick={() => openFor("start")} />{startError && <small className="field-error">{startError}</small>}</label><label>{endLabel}<input className={endError ? "input-error" : ""} placeholder={`选择${endLabel}`} readOnly value={endDate.replaceAll("-", "/")} onClick={() => openFor("end")} />{endError && <small className="field-error">{endError}</small>}</label></div>
    {open && <div className="return-date-calendar" role="dialog" aria-label={`选择${target === "start" ? startLabel : endLabel}日期`}><div className="calendar-toolbar"><button type="button" aria-label="上个月" onClick={() => moveMonth(-1)}>‹</button><div><button type="button" onClick={() => setView("years")}>{year} 年</button><button type="button" onClick={() => setView("months")}>{monthNumber} 月</button></div><button type="button" aria-label="下个月" onClick={() => moveMonth(1)}>›</button><button className="calendar-today" type="button" onClick={() => { setMonth(today.slice(0, 7)); setView("days"); }}>今天</button></div>
      {view === "days" && <><div className="return-calendar-weekdays">{["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>{day}</span>)}</div><div className="return-calendar-days" onMouseLeave={() => setHoveredEndDate("")}>{daysForMonth(month).map((date) => { const value = dateValue(date); const marker = markers[value]; const label = marker?.kind === "work" ? "班" : marker?.label; const disabled = target === "end" && value < startDate; const weekend = !marker && value.slice(0, 7) === month && (date.getDay() === 0 || date.getDay() === 6); const selected = value === startDate || Boolean(endDate && value === endDate); const rangeEnd = target === "end" && hoveredEndDate >= startDate ? hoveredEndDate : endDate; const inRange = Boolean(startDate && rangeEnd && value > startDate && value < rangeEnd); return <button className={`${value.slice(0, 7) !== month ? "outside-month " : ""}${selected ? "selected " : ""}${inRange ? "in-range " : ""}${value === today ? "today " : ""}${marker ? `holiday-${marker.kind} ` : ""}${weekend ? "weekend" : ""}`} disabled={disabled} key={value} title={label || undefined} type="button" onClick={() => selectDate(value)} onMouseEnter={() => { if (target === "end" && !disabled) setHoveredEndDate(value); }}>{label && <span className="calendar-holiday-marker" aria-hidden="true">{label}</span>}<span>{value === today ? "今天" : date.getDate()}</span></button>; })}</div></>}
      {view === "months" && <div className="calendar-choice-grid">{Array.from({ length: 12 }, (_, index) => { const value = index + 1; const disabled = target === "end" && (year < startYear || (year === startYear && value < startMonth)); return <button className={value === monthNumber ? "selected" : ""} disabled={disabled} key={value} type="button" onClick={() => { setMonth(`${year}-${String(value).padStart(2, "0")}`); setView("days"); }}>{value} 月</button>; })}</div>}
      {view === "years" && <div className="calendar-choice-grid">{Array.from({ length: 12 }, (_, index) => { const value = year - 5 + index; const disabled = target === "end" && value < startYear; return <button className={value === year ? "selected" : ""} disabled={disabled} key={value} type="button" onClick={() => { setMonth(`${value}-${String(monthNumber).padStart(2, "0")}`); setView("days"); }}>{value} 年</button>; })}</div>}
    </div>}
  </div>;
}
