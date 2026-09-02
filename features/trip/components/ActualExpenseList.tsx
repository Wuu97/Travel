import type { ItineraryItem, LedgerItem } from "../model";
import { useTripPresentation } from "./TripCapabilities";
import { IconButton } from "../../shared/components/IconButton";

export function ActualExpenseList({ expenses, onEdit, onRemove, plans, emptyMessage }: { expenses: LedgerItem[]; onEdit: (id: string) => void; onRemove: (id: string) => void; plans: ItineraryItem[]; emptyMessage?: string }) {
  const { editableStructure, interactionEnabled, permissionStatus } = useTripPresentation();
  const permissionsPending = permissionStatus === "loading";
  return (
    <div className="expense-list" style={{ display: "flex", flexDirection: "column", height: "100%", margin: 0, minHeight: 0, overflowY: "auto" }}>
      <b>消费明细</b>
      {expenses.length ? expenses.map((expense) => (
        <article key={expense.id}>
          <i>{expense.type === "住宿" ? "⌂" : expense.type === "餐饮" ? "♨" : expense.type === "交通" ? "↗" : "¥"}</i>
          <div><h4>{expense.title}</h4><p>{expense.type}{expense.date ? ` · ${expense.date}` : ""}{expense.payer ? ` · ${expense.payer} 支付` : ""}{expense.relatedItineraryItemId && (() => { const plan = plans.find((item) => item.id === expense.relatedItineraryItemId); return plan ? ` · Day ${plan.day ?? 1} · ${plan.title}` : expense.relatedItineraryTitle ? ` · ${expense.relatedItineraryTitle}` : ""; })()}{expense.note ? ` · ${expense.note}` : ""}</p></div>
          <strong>¥ {expense.amount}</strong>{editableStructure && <span className="expense-actions"><button aria-disabled={permissionsPending} className="expense-edit" type="button" aria-label={`编辑${expense.title}`} title="编辑" onClick={() => { if (interactionEnabled) onEdit(expense.id); }}>✎</button><IconButton aria-label={`删除${expense.title}`} disabled={permissionsPending} icon="trash" variant="danger" onClick={() => { if (interactionEnabled) onRemove(expense.id); }} /></span>}
        </article>
      )) : emptyMessage && <p className="empty-budget">{emptyMessage}</p>}
    </div>
  );
}
