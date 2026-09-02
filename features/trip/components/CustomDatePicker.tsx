"use client";

import { useState } from "react";
import { CalendarPopover, dateValue } from "./CalendarPopover";
import { IconButton } from "../../shared/components/IconButton";

type Props = { value: string; onChange: (value: string) => void; allowClear?: boolean; ariaLabel?: string; className?: string; disabled?: boolean; placeholder?: string };

/** Single-date wrapper with the same calendar interaction and optional empty value semantics. */
export function CustomDatePicker({ value, onChange, allowClear = false, ariaLabel = "选择日期", className = "", disabled = false, placeholder = "选择日期" }: Props) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState((value || dateValue(new Date())).slice(0, 7));
  const openPicker = () => { if (disabled) return; setMonth((value || dateValue(new Date())).slice(0, 7)); setOpen(true); };
  return <div className={`custom-date-picker ${className}`}><span className="date-field-control"><input aria-label={ariaLabel} disabled={disabled} placeholder={placeholder} readOnly value={value.replaceAll("-", "/")} onClick={openPicker} />{allowClear && value && <IconButton aria-label="清除日期" disabled={disabled} icon="clear" size="sm" variant="ghost-clear" onClick={() => onChange("")} />}</span>{open && <CalendarPopover ariaLabel={ariaLabel} month={month} onClose={() => setOpen(false)} onDateSelect={(next) => { onChange(next); setOpen(false); }} onMonthChange={setMonth} selected={(next) => next === value} />}</div>;
}
