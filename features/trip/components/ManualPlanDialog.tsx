import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { itineraryTypes } from "../data";
import type { ItineraryItem } from "../model";
import { typeColors } from "../utils";
import { TimePicker } from "./TimePicker";
import { useModalBehavior } from "../../shared/hooks/useModalBehavior";
import { useTripCapabilities } from "./TripCapabilities";
import { CustomSelect } from "../../shared/components/CustomSelect";
import { IconButton } from "../../shared/components/IconButton";
import { Button } from "../../shared/components/Button";

function inferLocation(title: string) {
  const trimmedTitle = title.trim();
  const destination = trimmedTitle.split(/\s*(?:→|->|—>|到|至)\s*/).at(-1)?.trim() || "";
  if (destination && destination !== trimmedTitle) return destination;
  return trimmedTitle.replace(/^(?:前往|去|游览|参观|打卡|入住)\s*/, "").trim();
}

type Props = {
  activeDay: number;
  days: Array<{ day: number; date: string }>;
  plan: ItineraryItem | null;
  onClose: () => void;
  onSave: () => void;
  setPlan: Dispatch<SetStateAction<ItineraryItem | null>>;
};

export function ManualPlanDialog({ activeDay, days, onClose, onSave, plan, setPlan }: Props) {
  const { canEditTrip } = useTripCapabilities();
  const [titleError, setTitleError] = useState(false);
  useModalBehavior(Boolean(plan), onClose);
  useEffect(() => { if (plan && !canEditTrip) onClose(); }, [canEditTrip, onClose, plan]);
  if (!plan || !canEditTrip) return null;
  const update = (patch: Partial<ItineraryItem>) => setPlan({ ...plan, ...patch });
  const updateTitle = (title: string) => setPlan((currentPlan) => currentPlan && {
    ...currentPlan,
    title,
    location: currentPlan.location || inferLocation(title),
  });
  return (
    <div className="edit-plan-backdrop">
      <button className="edit-plan-dismiss" type="button" aria-label="关闭手动添加" onClick={onClose} />
      <form className="edit-plan manual-plan" onSubmit={(event) => { event.preventDefault(); if (!canEditTrip) return; if (!plan.title.trim()) { setTitleError(true); return; } onSave(); }}>
        <div><b>手动添加行程</b><IconButton aria-label="关闭手动添加" icon="close" variant="ghost" onClick={onClose} /></div>
        <label>日期<CustomSelect ariaLabel="日期" options={days.map((item) => ({ value: String(item.day), label: `DAY ${item.day} · ${item.date}` }))} value={String(plan.day || activeDay)} onChange={(value) => update({ day: Number(value) })} /></label>
        <div className="field-label"><span>时间</span><TimePicker onChange={(time) => update({ time })} value={plan.time || ""} /></div>
        <label>行程名称<input aria-invalid={titleError} value={plan.title} placeholder="例如 杭州东站 → 西湖" onChange={(event) => { updateTitle(event.target.value); setTitleError(false); }} />{titleError && <small className="manual-form-error">请填写行程名称</small>}</label>
        <label>备注（可选）<input value={plan.note || ""} placeholder="例如 提前预约" onChange={(event) => update({ note: event.target.value })} /></label>
        <label>分类<CustomSelect ariaLabel="分类" options={itineraryTypes.map((value) => ({ value, label: value }))} value={plan.type} onChange={(value) => update({ type: value as ItineraryItem["type"] })} /></label>
        <span className="manual-type-preview" style={{ color: typeColors[plan.type].color, background: typeColors[plan.type].tint }}>● {plan.type}</span>
        <div className="edit-plan-actions"><Button type="button" variant="secondary" onClick={onClose}>取消</Button><Button type="submit">保存行程</Button></div>
      </form>
    </div>
  );
}
