import { useEffect, type Dispatch, type SetStateAction } from "react";
import { itineraryTypes } from "../data";
import type { ItineraryItem } from "../model";
import { TimePicker } from "./TimePicker";
import { useModalBehavior } from "../../shared/hooks/useModalBehavior";
import { useTripCapabilities } from "./TripCapabilities";
import { CustomSelect } from "../../shared/components/CustomSelect";
import { IconButton } from "../../shared/components/IconButton";
import { Button } from "../../shared/components/Button";

type Props = {
  plan: ItineraryItem | null;
  onClose: () => void;
  onSave: () => void;
  setPlan: Dispatch<SetStateAction<ItineraryItem | null>>;
};

export function PlanEditorDialog({ onClose, onSave, plan, setPlan }: Props) {
  const { canEditTrip } = useTripCapabilities();
  useModalBehavior(Boolean(plan), onClose);
  useEffect(() => { if (plan && !canEditTrip) onClose(); }, [canEditTrip, onClose, plan]);
  if (!plan || !canEditTrip) return null;
  const update = (patch: Partial<ItineraryItem>) => setPlan({ ...plan, ...patch });
  return (
    <div className="edit-plan-backdrop">
      <button className="edit-plan-dismiss" type="button" aria-label="关闭编辑" onClick={onClose} />
      <form className="edit-plan" onSubmit={(event) => { event.preventDefault(); if (canEditTrip) onSave(); }}>
        <div><b>编辑行程</b><IconButton aria-label="关闭编辑" icon="close" variant="ghost" onClick={onClose} /></div>
        <label>行程名称<input value={plan.title} onChange={(event) => update({ title: event.target.value })} /></label>
        <div className="field-label"><span>时间</span><TimePicker onChange={(time) => update({ time })} value={plan.time || ""} /></div>
        <label>备注<input value={plan.note || ""} placeholder="例如 提前预约" onChange={(event) => update({ note: event.target.value })} /></label>
        <label>分类<CustomSelect ariaLabel="分类" options={itineraryTypes.map((value) => ({ value, label: value }))} value={plan.type} onChange={(value) => update({ type: value as ItineraryItem["type"] })} /></label>
        <div className="edit-plan-actions"><Button type="button" variant="secondary" onClick={onClose}>取消</Button><Button type="submit">保存</Button></div>
      </form>
    </div>
  );
}
