import type { CategoryBudgetVsActual } from "../budgetRules";

export function ExpenseDistribution({ categories, actualTotal }: { categories: CategoryBudgetVsActual[]; actualTotal: number }) {
  return (
    <div className="budget-side" style={{ display: "flex", flex: "0 0 172px", flexDirection: "column", margin: 0, position: "static", width: "auto" }}>
      <b>开销分布</b>
      <div style={{ alignItems: "center", display: "grid", flex: 1, gap: 12, gridTemplateColumns: "132px minmax(0, 1fr)" }}>
        <div className="donut" style={{ margin: "0 auto" }}><span>¥ {actualTotal}<small>已支出</small></span></div>
        <div>
          {categories.length ? categories.map((item) => <p key={item.category}>■ {item.category}<br />预算 ¥ {item.budget} · 实际 ¥ {item.actual}<br /><em>{item.difference >= 0 ? `剩余 ¥ ${item.difference}` : `超支 ¥ ${Math.abs(item.difference)}`}</em></p>) : <p>尚无预算或实际支出</p>}
        </div>
      </div>
    </div>
  );
}
