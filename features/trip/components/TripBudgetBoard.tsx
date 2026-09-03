import { useState } from "react";
import { CustomSelect } from "../../shared/components/CustomSelect";
import { tripCategories, type ExpenseItem, type ItineraryItem, type LedgerItem } from "../model";
import { defaultLedgerFilters, filterLedgerItems, ledgerCsv, type LedgerFilters } from "../ledgerView";
import { getBudgetVsActual } from "../budgetRules";
import { ActualExpenseList } from "./ActualExpenseList";
import { BudgetSummary } from "./BudgetSummary";
import { ExpenseDistribution } from "./ExpenseDistribution";
import { ExpenseEntryForm } from "./ExpenseEntryForm";
import { CustomDateRangePicker } from "./CustomDateRangePicker";
import { PlannedExpenseList } from "./PlannedExpenseList";
import { useTripPresentation } from "./TripCapabilities";
import { Button } from "../../shared/components/Button";

type Props = { budgetItems: ExpenseItem[]; totalBudget: number | null; expenseAmount: string; expenseDate: string; expenseName: string; expenseNote: string; expensePayer: string; expenseType: ExpenseItem["type"]; expenseOccurrence: "actual" | "estimated"; expenses: LedgerItem[]; plans: ItineraryItem[]; relatedItineraryItemId: string; tripTitle: string; onAmountChange: (value: string) => void; onCancelExpense: () => void; onDateChange: (value: string) => void; onEditBudget: (id: string) => void; onEditExpense: (id: string) => void; onNameChange: (value: string) => void; onNoteChange: (value: string) => void; onPayerChange: (value: string) => void; onTypeChange: (type: ExpenseItem["type"]) => void; onOccurrenceChange: (value: "actual" | "estimated") => void; onRelatedItineraryChange: (value: string) => void; onRemoveBudget: (id: string) => void; onRemoveExpense: (id: string) => void; onSaveExpense: () => void; onToggleExpense: () => void; onTotalBudgetChange: (value: number | null) => void; showExpense: boolean };

export function TripBudgetBoard({ budgetItems, totalBudget, expenseAmount, expenseDate, expenseName, expenseNote, expensePayer, expenseType, expenseOccurrence, expenses, onAmountChange, onCancelExpense, onDateChange, onEditBudget, onEditExpense, onNameChange, onNoteChange, onOccurrenceChange, onPayerChange, onRelatedItineraryChange, onRemoveBudget, onRemoveExpense, onSaveExpense, onToggleExpense, onTotalBudgetChange, onTypeChange, plans, relatedItineraryItemId, showExpense, tripTitle }: Props) {
  const { editableStructure, interactionEnabled } = useTripPresentation();
  const [filters, setFilters] = useState<LedgerFilters>(defaultLedgerFilters);
  const comparison = getBudgetVsActual(totalBudget, budgetItems, expenses);
  const filteredBudget = filterLedgerItems(budgetItems, "estimated", filters, plans);
  const filteredActual = filterLedgerItems(expenses, "actual", filters, plans);
  const filteredEmpty = !filteredBudget.length && !filteredActual.length && Boolean(budgetItems.length || expenses.length);
  const exportableCount = filteredBudget.length + filteredActual.length;
  const exportCsv = () => { const blob = new Blob([ledgerCsv(filteredBudget, filteredActual, plans)], { type: "text/csv;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${tripTitle}-账本明细.csv`; link.click(); URL.revokeObjectURL(link.href); };
  return <div className="budget-board">
    <BudgetSummary interactionEnabled={interactionEnabled} onTotalBudgetChange={onTotalBudgetChange} totalBudget={comparison.totalBudget} estimatedTotal={comparison.estimatedTotal} actualTotal={comparison.actualTotal} transactionCount={expenses.length} />
    <div className="budget-toolbar"><input aria-label="搜索费用" placeholder="搜索费用或备注…" value={filters.query} onChange={(event) => setFilters({ ...filters, query: event.target.value })} /><CustomSelect ariaLabel="费用类型" className="budget-filter-select" options={[{ value: "all", label: "全部记录" }, { value: "estimated", label: "预计支出" }, { value: "actual", label: "实际支出" }]} value={filters.occurrence} onChange={(value) => setFilters({ ...filters, occurrence: value as LedgerFilters["occurrence"] })} /><CustomSelect ariaLabel="费用分类" className="budget-filter-select" options={[{ value: "all", label: "全部分类" }, ...tripCategories.map((value) => ({ value, label: value }))]} value={filters.category} onChange={(value) => setFilters({ ...filters, category: value as LedgerFilters["category"] })} /><CustomDateRangePicker allowClear className="budget-date-picker" endDate={filters.endDate} endLabel="结束日期" rangeClearVariant="icon" showIndividualClear={false} showLabels={false} showSeparator startDate={filters.startDate} startLabel="开始日期" onChange={({ startDate, endDate }) => setFilters({ ...filters, startDate, endDate })} /><Button type="button" variant="ghost" onClick={() => setFilters(defaultLedgerFilters)}>清除</Button><div className="budget-toolbar-actions">{editableStructure && <div className="budget-add-wrap"><Button disabled={!interactionEnabled} type="button" onClick={onToggleExpense}>＋ 记一笔</Button>{showExpense && <ExpenseEntryForm amount={expenseAmount} date={expenseDate} name={expenseName} note={expenseNote} payer={expensePayer} occurrence={expenseOccurrence} plans={plans} relatedItineraryItemId={relatedItineraryItemId} type={expenseType} onAmountChange={onAmountChange} onCancel={onCancelExpense} onDateChange={onDateChange} onNameChange={onNameChange} onNoteChange={onNoteChange} onOccurrenceChange={onOccurrenceChange} onPayerChange={onPayerChange} onRelatedItineraryChange={onRelatedItineraryChange} onTypeChange={onTypeChange} onSave={onSaveExpense} />}</div>}<Button disabled={!exportableCount} type="button" variant="secondary" onClick={exportCsv}>导出明细</Button></div></div>
    {filteredEmpty && <p className="empty-budget" role="status">没有符合条件的费用记录</p>}
    <div className="budget-grid">
      <ActualExpenseList emptyMessage={filteredEmpty ? "没有符合条件的费用记录" : undefined} expenses={filteredActual} onEdit={onEditExpense} onRemove={onRemoveExpense} plans={plans} />
      <aside className="finance-overview"><h2>财务概览</h2><ExpenseDistribution actualTotal={comparison.actualTotal} categories={comparison.categories} remainingBudget={comparison.remainingBudget} totalBudget={comparison.totalBudget} usageRate={comparison.usageRate} /><PlannedExpenseList emptyMessage={filteredEmpty ? "没有符合条件的费用记录" : undefined} items={filteredBudget} onEdit={onEditBudget} onRemove={onRemoveBudget} plans={plans} /></aside>
    </div>
  </div>;
}
