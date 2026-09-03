import { useRef, useState } from "react";
import { tripCategories, type ExpenseItem, type ItineraryItem } from "../model";
import { useTripPresentation } from "./TripCapabilities";
import { useOutsideClick } from "../../shared/hooks/useOutsideClick";
import { CustomSelect } from "../../shared/components/CustomSelect";
import { CustomDatePicker } from "./CustomDatePicker";
import { Button } from "../../shared/components/Button";

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
    <div className="expense-form-primary"><label className="expense-field"><span>分类 <em>*</em></span><CustomSelect ariaLabel="费用分类" disabled={!interactionEnabled} options={tripCategories.map((value) => ({ value, label: value }))} value={type} onChange={(value) => onTypeChange(value as ExpenseItem["type"])} /></label><label className="expense-field"><span>付款人 <em>*</em></span><input disabled={!interactionEnabled || occurrence === "estimated"} placeholder={occurrence === "estimated" ? "预计支出无需付款人" : "输入付款人"} value={payer} onChange={(event) => onPayerChange(event.target.value)} /></label></div>
    <button aria-expanded={showMore} className="expense-more" disabled={!interactionEnabled} type="button" onClick={() => setShowMore((current) => !current)}>{showMore ? "收起更多信息" : "＋ 更多信息"}</button>
    {showMore && <div className="expense-form-advanced"><label className="expense-field"><span>日期</span><CustomDatePicker allowClear ariaLabel="消费日期" className="expense-date-picker" disabled={!interactionEnabled} value={date} onChange={onDateChange} /></label><label className="expense-field"><span>备注</span><input disabled={!interactionEnabled} placeholder="可选" value={note} onChange={(event) => onNoteChange(event.target.value)} /></label><label className="expense-field"><span>关联攻略（可选）</span><CustomSelect ariaLabel="关联攻略" disabled={!interactionEnabled} options={[{ value: "", label: "不关联攻略" }, ...plans.map((plan) => ({ value: plan.id, label: `DAY ${plan.day ?? 1} · ${plan.title}` }))]} value={relatedItineraryItemId} onChange={onRelatedItineraryChange} /></label><label className="expense-field"><span>记录类型</span><CustomSelect ariaLabel="记录类型" disabled={!interactionEnabled} options={[{ value: "actual", label: "实际支出" }, { value: "estimated", label: "预计支出" }]} value={occurrence} onChange={(value) => onOccurrenceChange(value as "actual" | "estimated")} /></label></div>}
    <div className="expense-form-actions"><Button disabled={!interactionEnabled} size="sm" type="button" variant="secondary" onClick={onCancel}>取消</Button><Button disabled={!canSave} size="sm" type="submit">保存</Button></div>
  </form></div>;
}
