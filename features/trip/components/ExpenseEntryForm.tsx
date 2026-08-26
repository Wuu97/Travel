import type { ExpenseItem, ItineraryItem } from "../model";

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
  onDateChange: (date: string) => void;
  onNameChange: (name: string) => void;
  onNoteChange: (note: string) => void;
  onPayerChange: (payer: string) => void;
  onTypeChange: (type: ExpenseItem["type"]) => void;
  onOccurrenceChange: (occurrence: "actual" | "estimated") => void;
  onRelatedItineraryChange: (id: string) => void;
  onSave: () => void;
};

export function ExpenseEntryForm({ amount, date, name, note, occurrence, payer, onAmountChange, onDateChange, onNameChange, onNoteChange, onOccurrenceChange, onPayerChange, onRelatedItineraryChange, onSave, onTypeChange, plans, relatedItineraryItemId, type }: Props) {
  return (
    <div className="expense-form">
      <input placeholder="消费名称" value={name} onChange={(event) => onNameChange(event.target.value)} />
      <input type="number" min="0.01" step="0.01" placeholder="金额" value={amount} onChange={(event) => onAmountChange(event.target.value)} />
      <select aria-label="费用分类" value={type} onChange={(event) => onTypeChange(event.target.value as ExpenseItem["type"])}>{(["住宿", "餐饮", "交通", "门票", "活动", "其他"] as const).map((item) => <option key={item}>{item}</option>)}</select>
      <select aria-label="费用性质" value={occurrence} onChange={(event) => onOccurrenceChange(event.target.value as "actual" | "estimated")}><option value="actual">实际支出</option><option value="estimated">预计预算</option></select>
      <select aria-label="关联行程" value={relatedItineraryItemId} onChange={(event) => onRelatedItineraryChange(event.target.value)}><option value="">不关联行程</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>DAY {plan.day ?? 1} · {plan.title}</option>)}</select>
      {occurrence === "actual" && <><input aria-label="消费日期" type="date" value={date} onChange={(event) => onDateChange(event.target.value)} /><input placeholder="付款人" value={payer} onChange={(event) => onPayerChange(event.target.value)} /></>}
      <input placeholder="备注" value={note} onChange={(event) => onNoteChange(event.target.value)} />
      <button onClick={onSave}>保存{occurrence === "estimated" ? "预算" : "账目"}</button>
    </div>
  );
}
