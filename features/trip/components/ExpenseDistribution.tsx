import type { CategoryBudgetVsActual } from "../budgetRules";

export function ExpenseDistribution({ categories, actualTotal }: { categories: CategoryBudgetVsActual[]; actualTotal: number }) {
  const actualCategories = categories.filter((item) => item.actual > 0).sort((a, b) => b.actual - a.actual);
  return <section className="budget-side expense-distribution">
    <b>开销分布</b>
    {actualCategories.length ? <div className="distribution-content"><div className="donut"><span>¥{actualTotal}<small>已支出</small></span></div><div className="distribution-list">{actualCategories.map((item) => <p key={item.category}><span>{item.category}</span><strong>¥{item.actual}</strong><em>{actualTotal ? `${Math.round(item.actual / actualTotal * 100)}%` : "0%"}</em>{item.budget > 0 && <small>预计 ¥{item.budget} · 已支出 ¥{item.actual}</small>}</p>)}</div></div> : <p className="empty-budget">暂无实际支出</p>}
  </section>;
}
