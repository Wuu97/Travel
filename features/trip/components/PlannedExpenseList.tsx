import type { ExpenseItem, ItineraryItem } from "../model";
import { useTripCapabilities } from "./TripCapabilities";

export function PlannedExpenseList({ items, onEdit, onRemove, plans }: { items: ExpenseItem[]; onEdit: (id: string) => void; onRemove: (id: string) => void; plans: ItineraryItem[] }) {
  const { canEditTrip } = useTripCapabilities();
  return (
    <div className="expense-list planned-list" style={{ display: "flex", flex: 1, flexDirection: "column", margin: 0, minHeight: 0, overflowY: "auto" }}>
      <b>预计费用 <small>预算</small></b>
      {items.length ? items.map((item) => (
        <article key={item.id}>
          <i>¥</i>
          <div><h4>{item.title}</h4><p>{item.type}{item.relatedItineraryItemId && (() => { const plan = plans.find((entry) => entry.id === item.relatedItineraryItemId); return plan ? ` · Day ${plan.day ?? 1} · ${plan.title}` : item.relatedItineraryTitle ? ` · ${item.relatedItineraryTitle}` : ""; })()}</p></div>
          <strong>¥ {item.amount}</strong>{canEditTrip && <><button type="button" onClick={() => onEdit(item.id)}>编辑</button><button className="expense-remove" type="button" aria-label={`移除${item.title}`} onClick={() => onRemove(item.id)}>×</button></>}
        </article>
      )) : <p className="empty-budget">从 AI 回复中加入预计费用，会显示在这里。</p>}
    </div>
  );
}
