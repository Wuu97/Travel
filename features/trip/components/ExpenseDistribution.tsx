import type { LedgerItem } from "../model";

export function ExpenseDistribution({ expenses, total }: { expenses: LedgerItem[]; total: number }) {
  const categories = Object.entries(expenses.reduce<Partial<Record<LedgerItem["type"], number>>>((totals, expense) => {
    totals[expense.type] = (totals[expense.type] ?? 0) + expense.amount;
    return totals;
  }, {}));
  return (
    <div className="budget-side" style={{ display: "flex", flex: "0 0 172px", flexDirection: "column", margin: 0, position: "static", width: "auto" }}>
      <b>开销分布</b>
      <div style={{ alignItems: "center", display: "grid", flex: 1, gap: 12, gridTemplateColumns: "132px minmax(0, 1fr)" }}>
        <div className="donut" style={{ margin: "0 auto" }}><span>¥ {total}<small>已支出</small></span></div>
        <div>
          {categories.length ? categories.map(([type, amount]) => <p key={type}>■ {type} ¥ {amount} <em>{total ? `${Math.round((amount / total) * 100)}%` : "0%"}</em></p>) : <p>尚无实际支出</p>}
        </div>
      </div>
      <button type="button">查看共同结算 →</button>
    </div>
  );
}
