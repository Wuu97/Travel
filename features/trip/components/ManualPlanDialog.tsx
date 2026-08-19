import type { Dispatch, SetStateAction } from "react";
import { itineraryTypes } from "../data";
import type { ItineraryItem } from "../model";
import { typeColors } from "../utils";

type Props = {
  activeDay: number;
  days: Array<{ day: number; date: string }>;
  plan: ItineraryItem | null;
  onClose: () => void;
  onSave: () => void;
  setPlan: Dispatch<SetStateAction<ItineraryItem | null>>;
};

export function ManualPlanDialog({ activeDay, days, onClose, onSave, plan, setPlan }: Props) {
  if (!plan) return null;
  const update = (patch: Partial<ItineraryItem>) => setPlan({ ...plan, ...patch });
  return (
    <div className="edit-plan-backdrop">
      <button className="edit-plan-dismiss" type="button" aria-label="关闭手动添加" onClick={onClose} />
      <form className="edit-plan manual-plan" onSubmit={(event) => { event.preventDefault(); onSave(); }}>
        <div><b>手动添加行程</b><button type="button" aria-label="关闭手动添加" onClick={onClose}>×</button></div>
        <label>日期<select value={plan.day || activeDay} onChange={(event) => update({ day: Number(event.target.value) })}>{days.map((item) => <option key={item.day} value={item.day}>DAY {item.day} · {item.date}</option>)}</select></label>
        <label>时间<input value={plan.time || ""} placeholder="例如 09:30" onChange={(event) => update({ time: event.target.value })} /></label>
        <label>行程名称<input value={plan.title} placeholder="例如 杭州东站 → 西湖" onChange={(event) => update({ title: event.target.value })} /></label>
        <label>地点（可选）<input value={plan.location || ""} placeholder="例如 西湖断桥" onChange={(event) => update({ location: event.target.value })} /></label>
        <label>备注（可选）<input value={plan.note || ""} placeholder="例如 提前预约" onChange={(event) => update({ note: event.target.value })} /></label>
        <label>分类<select value={plan.type} onChange={(event) => update({ type: event.target.value as ItineraryItem["type"] })}>{itineraryTypes.filter((type) => type !== "活动").map((type) => <option key={type}>{type}</option>)}</select></label>
        <span className="manual-type-preview" style={{ color: typeColors[plan.type].color, background: typeColors[plan.type].tint }}>● {plan.type}</span>
        <div className="edit-plan-actions"><button type="button" onClick={onClose}>取消</button><button type="submit">保存行程</button></div>
      </form>
    </div>
  );
}
