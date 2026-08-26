import type { LedgerItem } from "../model";

export function ActualExpenseList({ expenses, onEdit, onRemove }: { expenses: LedgerItem[]; onEdit: (id: string) => void; onRemove: (id: string) => void }) {
  return (
    <div className="expense-list" style={{ display: "flex", flexDirection: "column", height: "100%", margin: 0, minHeight: 0, overflowY: "auto" }}>
      <b>消费明细 <small>已发生</small></b>
      {expenses.map((expense) => (
        <article key={expense.id}>
          <i>{expense.type === "住宿" ? "⌂" : expense.type === "餐饮" ? "♨" : expense.type === "交通" ? "↗" : "¥"}</i>
          <div><h4>{expense.title}</h4><p>{expense.type}{expense.date ? ` · ${expense.date}` : ""}{expense.payer ? ` · ${expense.payer} 支付` : ""}{expense.relatedItineraryTitle ? ` · 关联 ${expense.relatedItineraryTitle}` : ""}{expense.note ? ` · ${expense.note}` : ""}</p></div>
          <strong>¥ {expense.amount}</strong><button type="button" onClick={() => onEdit(expense.id)}>编辑</button><button className="expense-remove" type="button" aria-label={`删除${expense.title}`} onClick={() => onRemove(expense.id)}>×</button>
        </article>
      ))}
    </div>
  );
}
