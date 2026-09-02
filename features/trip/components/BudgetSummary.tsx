import { useState } from "react";

type Props = {
  totalBudget: number | null;
  estimatedTotal: number;
  actualTotal: number;
  transactionCount: number;
  onTotalBudgetChange: (value: number | null) => void;
  interactionEnabled?: boolean;
};

export function BudgetSummary({ totalBudget, estimatedTotal, actualTotal, transactionCount, onTotalBudgetChange, interactionEnabled = true }: Props) {
  const [editingBudget, setEditingBudget] = useState(false);
  const [draftBudget, setDraftBudget] = useState("");
  const commitBudget = () => {
    const value = draftBudget.trim();
    const parsed = Number(value);
    if (value === "") onTotalBudgetChange(null);
    else if (Number.isFinite(parsed) && parsed >= 0) onTotalBudgetChange(parsed);
    setEditingBudget(false);
  };
  const formatAmount = (amount: number) => amount.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
  const beginBudgetEdit = () => { setDraftBudget(totalBudget === null ? "" : String(totalBudget)); setEditingBudget(true); };
  return <section className="budget-summary">
    <div className="budget-summary-heading"><div className="budget-summary-metrics">
      <div className="budget-metric"><span>总预算</span><p className="budget-value-row">{editingBudget ? <input autoFocus aria-label="总预算" inputMode="decimal" value={draftBudget} placeholder="输入金额" onChange={(event) => setDraftBudget(event.target.value)} onBlur={commitBudget} onKeyDown={(event) => { if (event.key === "Enter") commitBudget(); if (event.key === "Escape") setEditingBudget(false); }} /> : interactionEnabled ? <button aria-label={totalBudget === null ? "设置总预算" : "编辑总预算"} className="budget-value-button" title="点击编辑总预算" type="button" onClick={beginBudgetEdit}><strong>{totalBudget === null ? "–" : `¥${formatAmount(totalBudget)}`}</strong></button> : <strong>{totalBudget === null ? "–" : `¥${formatAmount(totalBudget)}`}</strong>}</p></div>
      <div className="budget-metric"><span>已支出</span><p className="budget-value-row"><strong>¥{formatAmount(actualTotal)}</strong></p><small className="budget-metric-secondary">{transactionCount} 笔</small></div>
      <div className="budget-metric"><span>预计支出</span><p className="budget-value-row"><strong>¥{formatAmount(estimatedTotal)}</strong></p></div>
    </div></div>
  </section>;
}
