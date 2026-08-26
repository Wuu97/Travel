type Props = {
  plannedTotal: number;
  actualTotal: number;
  remaining: number;
  usageRate: number;
  onToggleExpense: () => void;
};

export function BudgetSummary({ plannedTotal, actualTotal, remaining, usageRate, onToggleExpense }: Props) {
  const progress = Math.min(usageRate, 100);
  return (
    <div className="budget-summary">
      <div>
        <span>总预算</span>
        <strong>¥ {plannedTotal}</strong>
        <small>由预计费用自动汇总</small>
      </div>
      <div className="progress">
        <p>已支出 <b>¥ {actualTotal}</b></p>
        <i><b style={{ width: `${progress}%` }} /></i>
        <small>{remaining >= 0 ? `剩余 ¥ ${remaining}` : `已超支 ¥ ${Math.abs(remaining)}`} · 使用率 {usageRate.toFixed(1)}%</small>
      </div>
      <button onClick={onToggleExpense}>＋ 记一笔</button>
    </div>
  );
}
