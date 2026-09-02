"use client";

import { useState } from "react";
import { CalendarPopover, dateValue } from "./CalendarPopover";

type Target = "start" | "end";
type Props = { endDate: string; onChange: (dates: { startDate: string; endDate: string }) => void; startDate: string; allowClear?: boolean; className?: string; endError?: string; endLabel?: string; rangeClearVariant?: "text" | "icon"; showIndividualClear?: boolean; showLabels?: boolean; showSeparator?: boolean; startError?: string; startLabel?: string };

/** Date-range wrapper: range handoff and validation stay here; calendar chrome is shared. */
export function CustomDateRangePicker({ endDate, onChange, startDate, allowClear = false, className = "", endError, endLabel = "返程", rangeClearVariant = "text", showIndividualClear = true, showLabels = true, showSeparator = false, startError, startLabel = "出发" }: Props) {
  const [target, setTarget] = useState<Target>("start");
  const [month, setMonth] = useState((startDate || dateValue(new Date())).slice(0, 7));
  const [open, setOpen] = useState(false);
  const [hoveredEndDate, setHoveredEndDate] = useState("");
  const today = dateValue(new Date());
  const openFor = (next: Target) => { setTarget(next); setHoveredEndDate(""); setMonth(((next === "start" ? startDate : endDate) || startDate || endDate || today).slice(0, 7)); setOpen(true); };
  const clear = (which: Target) => { onChange(which === "start" ? { startDate: "", endDate } : { startDate, endDate: "" }); if (target === which) setOpen(false); };
  const clearRange = () => { onChange({ startDate: "", endDate: "" }); setHoveredEndDate(""); setOpen(false); };
  const selectDate = (value: string) => {
    if (target === "end") { onChange({ startDate, endDate: value }); setHoveredEndDate(""); setOpen(false); return; }
    const chooseEnd = !endDate || value > endDate;
    onChange({ startDate: value, endDate: chooseEnd && endDate ? value : endDate });
    setMonth(value.slice(0, 7)); setHoveredEndDate(""); setTarget("end"); setOpen(chooseEnd);
  };
  return <div className={`custom-date-range ${className}`} data-calendar-target={target}>
    <div className="date-popover-fields"><label>{showLabels && startLabel}<span className="date-field-control"><input aria-label={startLabel} className={startError ? "input-error" : ""} placeholder={`选择${startLabel}`} readOnly value={startDate.replaceAll("-", "/")} onClick={() => openFor("start")} />{allowClear && showIndividualClear && startDate && <button aria-label={`清除${startLabel}`} type="button" onClick={() => clear("start")}>×</button>}</span>{startError && <small className="field-error">{startError}</small>}</label>{showSeparator && <span aria-hidden="true" className="date-range-separator">-</span>}<label>{showLabels && endLabel}<span className="date-field-control"><input aria-label={endLabel} className={endError ? "input-error" : ""} placeholder={`选择${endLabel}`} readOnly value={endDate.replaceAll("-", "/")} onClick={() => openFor("end")} />{allowClear && showIndividualClear && endDate && <button aria-label={`清除${endLabel}`} type="button" onClick={() => clear("end")}>×</button>}</span>{endError && <small className="field-error">{endError}</small>}</label>{allowClear && (startDate || endDate || rangeClearVariant === "icon") && <button aria-label="清除日期筛选" className={`date-range-clear${rangeClearVariant === "icon" ? " is-icon" : ""}${startDate || endDate ? "" : " is-hidden"}`} type="button" onClick={clearRange}>{rangeClearVariant === "icon" ? "×" : "清除日期"}</button>}</div>
    {open && <CalendarPopover ariaLabel={`选择${target === "start" ? startLabel : endLabel}日期`} disabled={(value) => target === "end" && Boolean(startDate) && value < startDate} inRange={(value) => Boolean(startDate && (target === "end" && hoveredEndDate >= startDate ? hoveredEndDate : endDate) && value > startDate && value < (target === "end" && hoveredEndDate >= startDate ? hoveredEndDate : endDate))} month={month} onClose={() => { setOpen(false); setHoveredEndDate(""); }} onDateHover={(value) => { if (target === "end") setHoveredEndDate(value); }} onDateSelect={selectDate} onMonthChange={setMonth} onPointerLeave={() => setHoveredEndDate("")} selected={(value) => value === startDate || Boolean(endDate && value === endDate)} />}
  </div>;
}
