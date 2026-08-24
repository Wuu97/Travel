import type { Dispatch, SetStateAction } from "react";
import { itineraryTypes } from "../data";
import type { ItineraryItem } from "../model";
import { TimePicker } from "./TimePicker";
import { useModalBehavior } from "../../shared/hooks/useModalBehavior";

type Props = {
  plan: ItineraryItem | null;
  onClose: () => void;
  onSave: () => void;
  setPlan: Dispatch<SetStateAction<ItineraryItem | null>>;
};

export function PlanEditorDialog({ onClose, onSave, plan, setPlan }: Props) {
  useModalBehavior(Boolean(plan), onClose);
  if (!plan) return null;
  const update = (patch: Partial<ItineraryItem>) => setPlan({ ...plan, ...patch });
  return (
    <div className="edit-plan-backdrop">
      <button className="edit-plan-dismiss" type="button" aria-label="关闭编辑" onClick={onClose} />
      <form className="edit-plan" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
        <div><b>编辑行程</b><button type="button" aria-label="关闭编辑" onClick={onClose}>×</button></div>
        <label>行程名称<input value={plan.title} onChange={(event) => update({ title: event.target.value })} /></label>
        <div className="field-label"><span>时间</span><TimePicker onChange={(time) => update({ time })} value={plan.time || ""} /></div>
        <label>备注<input value={plan.note || ""} placeholder="例如 提前预约" onChange={(event) => update({ note: event.target.value })} /></label>
        <label>分类<select value={plan.type} onChange={(event) => update({ type: event.target.value as ItineraryItem["type"] })}>{itineraryTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <div className="edit-plan-actions"><button type="button" onClick={onClose}>取消</button><button type="submit">保存</button></div>
      </form>
    </div>
  );
}
