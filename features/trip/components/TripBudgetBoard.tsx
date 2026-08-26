import { useState } from "react";
import type { ExpenseItem, ItineraryItem, LedgerItem } from "../model";
import { defaultLedgerFilters, filterLedgerItems, ledgerCsv, type LedgerFilters } from "../ledgerView";
import { getBudgetVsActual } from "../budgetRules";
import { ActualExpenseList } from "./ActualExpenseList";
import { BudgetSummary } from "./BudgetSummary";
import { ExpenseDistribution } from "./ExpenseDistribution";
import { ExpenseEntryForm } from "./ExpenseEntryForm";
import { PlannedExpenseList } from "./PlannedExpenseList";
import { useTripCapabilities } from "./TripCapabilities";

type Props = { budgetItems: ExpenseItem[]; expenseAmount: string; expenseDate: string; expenseName: string; expenseNote: string; expensePayer: string; expenseType: ExpenseItem["type"]; expenseOccurrence: "actual" | "estimated"; expenses: LedgerItem[]; plans: ItineraryItem[]; relatedItineraryItemId: string; tripTitle: string; onAmountChange: (value: string) => void; onDateChange: (value: string) => void; onEditBudget: (id: string) => void; onEditExpense: (id: string) => void; onNameChange: (value: string) => void; onNoteChange: (value: string) => void; onPayerChange: (value: string) => void; onTypeChange: (type: ExpenseItem["type"]) => void; onOccurrenceChange: (value: "actual" | "estimated") => void; onRelatedItineraryChange: (value: string) => void; onRemoveBudget: (id: string) => void; onRemoveExpense: (id: string) => void; onSaveExpense: () => void; onToggleExpense: () => void; showExpense: boolean };

export function TripBudgetBoard({ budgetItems, expenseAmount, expenseDate, expenseName, expenseNote, expensePayer, expenseType, expenseOccurrence, expenses, onAmountChange, onDateChange, onEditBudget, onEditExpense, onNameChange, onNoteChange, onOccurrenceChange, onPayerChange, onRelatedItineraryChange, onRemoveBudget, onRemoveExpense, onSaveExpense, onToggleExpense, onTypeChange, plans, relatedItineraryItemId, showExpense, tripTitle }: Props) {
  const { canEditTrip } = useTripCapabilities();
  const [filters, setFilters] = useState<LedgerFilters>(defaultLedgerFilters);
  const comparison = getBudgetVsActual(budgetItems, expenses);
  const filteredBudget = filterLedgerItems(budgetItems, "estimated", filters, plans);
  const filteredActual = filterLedgerItems(expenses, "actual", filters, plans);
  const filteredEmpty = !filteredBudget.length && !filteredActual.length && Boolean(budgetItems.length || expenses.length);
  const exportCsv = () => { const blob = new Blob([ledgerCsv(budgetItems, expenses, plans)], { type: "text/csv;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${tripTitle}-账本.csv`; link.click(); URL.revokeObjectURL(link.href); };
  return <div className="budget-board" style={{ display: "flex", flexDirection: "column", height: 600, overflow: "hidden" }}>
    <BudgetSummary canAddExpense={canEditTrip} onToggleExpense={onToggleExpense} plannedTotal={comparison.plannedTotal} actualTotal={comparison.actualTotal} remaining={comparison.remaining} usageRate={comparison.usageRate} />
    <div className="budget-toolbar"><input aria-label="搜索费用" placeholder="搜索费用、备注、付款人或行程" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} /><select aria-label="费用类型" value={filters.occurrence} onChange={(event) => setFilters({ ...filters, occurrence: event.target.value as LedgerFilters["occurrence"] })}><option value="all">全部</option><option value="estimated">预计费用</option><option value="actual">实际支出</option></select><select aria-label="费用分类" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value as LedgerFilters["category"] })}><option value="all">全部分类</option>{["住宿", "餐饮", "交通", "门票", "活动", "其他"].map((item) => <option key={item}>{item}</option>)}</select><input aria-label="开始日期" type="date" value={filters.startDate} onChange={(event) => setFilters({ ...filters, startDate: event.target.value })} /><input aria-label="结束日期" type="date" value={filters.endDate} onChange={(event) => setFilters({ ...filters, endDate: event.target.value })} /><button type="button" onClick={() => setFilters(defaultLedgerFilters)}>清除筛选</button><button type="button" disabled={!budgetItems.length && !expenses.length} onClick={exportCsv}>导出 CSV</button></div>
    {filteredEmpty && <p className="empty-budget" role="status">没有符合条件的费用记录</p>}
    {showExpense && <ExpenseEntryForm amount={expenseAmount} date={expenseDate} name={expenseName} note={expenseNote} payer={expensePayer} occurrence={expenseOccurrence} plans={plans} relatedItineraryItemId={relatedItineraryItemId} type={expenseType} onAmountChange={onAmountChange} onDateChange={onDateChange} onNameChange={onNameChange} onNoteChange={onNoteChange} onOccurrenceChange={onOccurrenceChange} onPayerChange={onPayerChange} onRelatedItineraryChange={onRelatedItineraryChange} onTypeChange={onTypeChange} onSave={onSaveExpense} />}
    <div className="budget-grid" style={{ display: "grid", flex: 1, gap: 16, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", minHeight: 0 }}>
      <ActualExpenseList emptyMessage={filteredEmpty ? "没有符合条件的费用记录" : undefined} expenses={filteredActual} onEdit={onEditExpense} onRemove={onRemoveExpense} plans={plans} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}><PlannedExpenseList emptyMessage={filteredEmpty ? "没有符合条件的费用记录" : undefined} items={filteredBudget} onEdit={onEditBudget} onRemove={onRemoveBudget} plans={plans} /><ExpenseDistribution categories={comparison.categories} actualTotal={comparison.actualTotal} /></div>
    </div>
  </div>;
}
