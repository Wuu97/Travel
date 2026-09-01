import { useRef, useState } from "react";
import type { ExpenseItem, ItineraryItem } from "../model";
import { useTripPresentation } from "./TripCapabilities";
import { useOutsideClick } from "../../shared/hooks/useOutsideClick";

type Props = {
  amount: string;
  date: string;
  name: string;
  note: string;
  payer: string;
  type: ExpenseItem["type"];
  occurrence: "actual" | "estimated";
  plans: ItineraryItem[];
  relatedItineraryItemId: string;
  onAmountChange: (amount: string) => void;
  onCancel: () => void;
  onDateChange: (date: string) => void;
  onNameChange: (name: string) => void;
  onNoteChange: (note: string) => void;
  onPayerChange: (payer: string) => void;
  onTypeChange: (type: ExpenseItem["type"]) => void;
  onOccurrenceChange: (occurrence: "actual" | "estimated") => void;
  onRelatedItineraryChange: (id: string) => void;
  onSave: () => void;
};

export function ExpenseEntryForm({ amount, date, name, note, occurrence, payer, onAmountChange, onCancel, onDateChange, onNameChange, onNoteChange, onOccurrenceChange, onPayerChange, onRelatedItineraryChange, onSave, onTypeChange, plans, relatedItineraryItemId, type }: Props) {
  const { interactionEnabled } = useTripPresentation();
  const [showMore, setShowMore] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  useOutsideClick(popoverRef, true, onCancel);
  const numericAmount = Number(amount);
  const canSave = interactionEnabled && name.trim().length > 0 && Number.isFinite(numericAmount) && numericAmount > 0 && (occurrence === "estimated" || payer.trim().length > 0);
  return <div className="expense-entry-popover" ref={popoverRef}><form className="expense-form" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); onCancel(); } }} onSubmit={(event) => { event.preventDefault(); if (canSave) onSave(); }}>
    <div className="expense-form-heading"><b>记一笔</b></div>
    <label className="expense-field expense-field-amount"><span>金额 <em>*</em></span><div><i aria-hidden="true">¥</i><input autoFocus disabled={!interactionEnabled} inputMode="decimal" placeholder="0.00" type="text" value={amount} onChange={(event) => onAmountChange(event.target.value)} /></div></label>
    <label className="expense-field"><span>名称 <em>*</em></span><input disabled={!interactionEnabled} placeholder="例如：晚餐、打车" value={name} onChange={(event) => onNameChange(event.target.value)} /></label>
    <div className="expense-form-primary"><label className="expense-field"><span>分类 <em>*</em></span><select disabled={!interactionEnabled} aria-label="费用分类" value={type} onChange={(event) => onTypeChange(event.target.value as ExpenseItem["type"])}>{(["住宿", "餐饮", "交通", "门票", "活动", "其他"] as const).map((item) => <option key={item}>{item}</option>)}</select></label><label className="expense-field"><span>付款人 <em>*</em></span><input disabled={!interactionEnabled || occurrence === "estimated"} placeholder={occurrence === "estimated" ? "预计支出无需付款人" : "输入付款人"} value={payer} onChange={(event) => onPayerChange(event.target.value)} /></label></div>
    <button aria-expanded={showMore} className="expense-more" disabled={!interactionEnabled} type="button" onClick={() => setShowMore((current) => !current)}>{showMore ? "收起更多信息" : "＋ 更多信息"}</button>
    {showMore && <div className="expense-form-advanced"><label className="expense-field"><span>日期</span><input disabled={!interactionEnabled} type="date" value={date} onChange={(event) => onDateChange(event.target.value)} /></label><label className="expense-field"><span>备注</span><input disabled={!interactionEnabled} placeholder="可选" value={note} onChange={(event) => onNoteChange(event.target.value)} /></label><label className="expense-field"><span>关联攻略（可选）</span><select disabled={!interactionEnabled} aria-label="关联攻略" value={relatedItineraryItemId} onChange={(event) => onRelatedItineraryChange(event.target.value)}><option value="">不关联攻略</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>DAY {plan.day ?? 1} · {plan.title}</option>)}</select></label><label className="expense-field"><span>记录类型</span><select disabled={!interactionEnabled} aria-label="记录类型" value={occurrence} onChange={(event) => onOccurrenceChange(event.target.value as "actual" | "estimated")}><option value="actual">实际支出</option><option value="estimated">预计支出</option></select></label></div>}
    <div className="expense-form-actions"><button className="expense-cancel" disabled={!interactionEnabled} type="button" onClick={onCancel}>取消</button><button className="expense-save" disabled={!canSave} type="submit">保存</button></div>
  </form></div>;
}
