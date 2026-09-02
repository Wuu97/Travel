import type { CategoryBudgetVsActual } from "../budgetRules";
import { typeColors } from "../utils";

type Props = { actualTotal: number; categories: CategoryBudgetVsActual[]; remainingBudget: number | null; totalBudget: number | null; usageRate: number | null };

export function ExpenseDistribution({ actualTotal, categories, remainingBudget, totalBudget, usageRate }: Props) {
  const actualCategories = categories.filter((item) => item.actual > 0).sort((a, b) => b.actual - a.actual);
  const roundedPercentages = actualCategories.map((item) => Math.round(item.actual / actualTotal * 1000));
  const largestCategoryIndex = actualCategories.reduce((largest, item, index) => item.actual > actualCategories[largest].actual ? index : largest, 0);
  if (roundedPercentages.length) roundedPercentages[largestCategoryIndex] += 1000 - roundedPercentages.reduce((sum, percentage) => sum + percentage, 0);
  let offset = 0;
  const donutGradient = actualCategories.map((item) => { const start = offset; const end = offset + item.actual / actualTotal * 100; offset = end; return `${typeColors[item.category].color} ${start}% ${end}%`; }).join(", ");
  const hasBudgetUsage = totalBudget !== null && totalBudget > 0 && remainingBudget !== null && usageRate !== null;
  const isOverBudget = hasBudgetUsage && remainingBudget < 0;
  const overBudgetRate = isOverBudget ? ((actualTotal - totalBudget!) / totalBudget!) * 100 : 0;
  const formatAmount = (amount: number) => amount.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  const formatPercent = (rate: number) => rate.toLocaleString("zh-CN", { maximumFractionDigits: 1 });
  return <section className="expense-distribution finance-section">
    {actualCategories.length ? <div className="distribution-content"><div aria-label="实际支出分类占比" className="donut" style={{ background: `conic-gradient(${donutGradient})` }}><span>¥{formatAmount(actualTotal)}<small>已支出</small></span></div><div className="distribution-list">{actualCategories.map((item, index) => <p key={item.category}><i aria-hidden="true" style={{ background: typeColors[item.category].color }} /><span>{item.category}</span><strong>¥{formatAmount(item.actual)}</strong><em>{formatPercent(roundedPercentages[index] / 10)}%</em>{item.budget > 0 && <small>预计 ¥{formatAmount(item.budget)} · 已支出 ¥{formatAmount(item.actual)}</small>}</p>)}</div></div> : <p className="empty-budget">暂无实际支出</p>}
    {hasBudgetUsage && <div className={`budget-usage${isOverBudget ? " is-over" : ""}`}><b>预算使用</b><i><span style={{ width: `${Math.min(usageRate!, 100)}%` }} /></i><p>已支出 ¥{formatAmount(actualTotal)} / 剩余 ¥{formatAmount(isOverBudget ? 0 : remainingBudget!)}</p><small>{isOverBudget ? <><strong>已超支 ¥{formatAmount(Math.abs(remainingBudget!))}</strong> · 超出预算 {formatPercent(overBudgetRate)}%</> : <>已使用 {formatPercent(usageRate!)}%</>}</small></div>}
  </section>;
}
