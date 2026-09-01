import type { ExpenseItem, ItineraryItem } from "../model";
import { useTripPresentation } from "./TripCapabilities";

export function PlannedExpenseList({ items, onEdit, onRemove, plans, emptyMessage }: { items: ExpenseItem[]; onEdit: (id: string) => void; onRemove: (id: string) => void; plans: ItineraryItem[]; emptyMessage?: string }) {
  const { editableStructure, interactionEnabled, permissionStatus } = useTripPresentation();
  const permissionsPending = permissionStatus === "loading";
  return (
    <div className="expense-list planned-list" style={{ display: "flex", flex: 1, flexDirection: "column", margin: 0, minHeight: 0, overflowY: "auto" }}>
      <b>预计支出 <small>待发生</small></b>
      {items.length ? items.map((item) => (
        <article key={item.id}>
          <i>¥</i>
          <div><h4>{item.title}</h4><p>{item.type}{item.relatedItineraryItemId && (() => { const plan = plans.find((entry) => entry.id === item.relatedItineraryItemId); return plan ? ` · Day ${plan.day ?? 1} · ${plan.title}` : item.relatedItineraryTitle ? ` · ${item.relatedItineraryTitle}` : ""; })()}</p></div>
          <strong>¥ {item.amount}</strong>{editableStructure && <span className="expense-actions"><button aria-disabled={permissionsPending} className="expense-edit" type="button" aria-label={`编辑${item.title}`} title="编辑" onClick={() => { if (interactionEnabled) onEdit(item.id); }}>✎</button><button aria-disabled={permissionsPending} className="expense-remove" type="button" aria-label={`移除${item.title}`} onClick={() => { if (interactionEnabled) onRemove(item.id); }}>×</button></span>}
        </article>
      )) : <p className="empty-budget">{emptyMessage || "暂无预计支出，可从攻略添加。"}</p>}
    </div>
  );
}
