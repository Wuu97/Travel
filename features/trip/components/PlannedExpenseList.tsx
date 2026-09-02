import { useState } from "react";
import type { ExpenseItem, ItineraryItem } from "../model";
import { useTripPresentation } from "./TripCapabilities";

export function PlannedExpenseList({ items, onEdit, onRemove, plans, emptyMessage }: { items: ExpenseItem[]; onEdit: (id: string) => void; onRemove: (id: string) => void; plans: ItineraryItem[]; emptyMessage?: string }) {
  const { editableStructure, interactionEnabled, permissionStatus } = useTripPresentation();
  const [expanded, setExpanded] = useState(false);
  const permissionsPending = permissionStatus === "loading";
  const hasMore = items.length > 5;
  const visibleItems = expanded ? items : items.slice(0, 5);
  return (
    <section className="expense-list planned-list finance-section">
      <h3>预计支出 <small>· {items.length} 笔</small></h3>
      {items.length ? visibleItems.map((item) => (
        <article key={item.id}>
          <i>¥</i>
          <div><h4>{item.title}</h4><p>{item.type}{item.relatedItineraryItemId && (() => { const plan = plans.find((entry) => entry.id === item.relatedItineraryItemId); return plan ? ` · Day ${plan.day ?? 1} · ${plan.title}` : item.relatedItineraryTitle ? ` · ${item.relatedItineraryTitle}` : ""; })()}</p></div>
          <strong>¥ {item.amount}</strong>{editableStructure && <span className="expense-actions"><button aria-disabled={permissionsPending} className="expense-edit" type="button" aria-label={`编辑${item.title}`} title="编辑" onClick={() => { if (interactionEnabled) onEdit(item.id); }}>✎</button><button aria-disabled={permissionsPending} className="expense-remove" type="button" aria-label={`移除${item.title}`} onClick={() => { if (interactionEnabled) onRemove(item.id); }}>×</button></span>}
        </article>
      )) : <p className="empty-budget">{emptyMessage || "暂无预计支出，可在账本中添加。"}</p>}
      {hasMore && <button className="planned-list-toggle" type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? "收起" : `查看全部 ${items.length} 笔 →`}</button>}
    </section>
  );
}
