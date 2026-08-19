type Props = {
  plannedTotal: number;
  total: number;
  onToggleExpense: () => void;
};

export function BudgetSummary({ plannedTotal, total, onToggleExpense }: Props) {
  const remaining = plannedTotal - total;
  const percent = plannedTotal ? Math.min((total / plannedTotal) * 100, 100) : 0;
  return (
    <div className="budget-summary">
      <div>
        <span>总预算</span>
        <strong>¥ {plannedTotal}</strong>
        <small>由预计费用自动汇总</small>
      </div>
      <div className="progress">
        <p>已支出 <b>¥ {total}</b></p>
        <i><b style={{ width: `${percent}%` }} /></i>
        <small>{remaining >= 0 ? `还可使用 ¥ ${remaining}` : `已超预算 ¥ ${Math.abs(remaining)}`}</small>
      </div>
      <button onClick={onToggleExpense}>＋ 记一笔</button>
    </div>
  );
}
