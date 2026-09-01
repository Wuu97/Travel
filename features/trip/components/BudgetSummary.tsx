import { useState, type ReactNode } from "react";

type Props = {
  totalBudget: number | null;
  estimatedTotal: number;
  actualTotal: number;
  remainingBudget: number | null;
  usageRate: number | null;
  transactionCount: number;
  onTotalBudgetChange: (value: number | null) => void;
  onToggleExpense: () => void;
  expenseEntry?: ReactNode;
  showExpense?: boolean;
  canAddExpense?: boolean;
  interactionEnabled?: boolean;
};

export function BudgetSummary({ totalBudget, estimatedTotal, actualTotal, remainingBudget, usageRate, transactionCount, onTotalBudgetChange, onToggleExpense, canAddExpense = true, expenseEntry, interactionEnabled = true, showExpense = false }: Props) {
  const [editingBudget, setEditingBudget] = useState(false);
  const [draftBudget, setDraftBudget] = useState("");
  const commitBudget = () => {
    const value = draftBudget.trim();
    const parsed = Number(value);
    if (value === "") onTotalBudgetChange(null);
    else if (Number.isFinite(parsed) && parsed >= 0) onTotalBudgetChange(parsed);
    setEditingBudget(false);
  };
  const hasProgress = totalBudget !== null && totalBudget > 0;
  const progress = hasProgress ? Math.min(usageRate ?? 0, 100) : 0;
  return <section className="budget-summary">
    <div className="budget-summary-heading"><b>预算概览</b><div className="budget-summary-metrics">
      <div><span>总预算</span><p>{editingBudget ? <input autoFocus aria-label="总预算" inputMode="decimal" value={draftBudget} placeholder="输入金额" onChange={(event) => setDraftBudget(event.target.value)} onBlur={commitBudget} onKeyDown={(event) => { if (event.key === "Enter") commitBudget(); if (event.key === "Escape") setEditingBudget(false); }} /> : <><strong>{totalBudget === null ? "未设置" : `¥${totalBudget}`}</strong>{interactionEnabled && <button className="budget-set" type="button" onClick={() => { setDraftBudget(totalBudget === null ? "" : String(totalBudget)); setEditingBudget(true); }}>{totalBudget === null ? "设置 →" : "修改 →"}</button>}</>}</p></div>
      <div><span>已支出</span><p><strong>¥{actualTotal}</strong><small>· {transactionCount} 笔</small></p></div>
      <div><span>预计支出</span><p><strong>¥{estimatedTotal}</strong><small>· {estimatedTotal ? "待发生" : "暂无"}</small></p></div>
    </div>{canAddExpense && <div className="budget-add-wrap"><button aria-disabled={!interactionEnabled} className="budget-add" type="button" onClick={() => { if (interactionEnabled) onToggleExpense(); }}>＋ 记一笔</button>{showExpense && expenseEntry}</div>}</div>
    {hasProgress && <div className="budget-progress"><i><b style={{ width: `${progress}%` }} /></i><small>{remainingBudget! >= 0 ? `剩余 ¥${remainingBudget}` : `超支 ¥${Math.abs(remainingBudget!)}`} · 已使用 {usageRate!.toFixed(1)}%</small></div>}
  </section>;
}
