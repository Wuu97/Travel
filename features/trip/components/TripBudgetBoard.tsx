import type { ExpenseItem, ItineraryItem, LedgerItem } from "../model";
import { getBudgetVsActual } from "../budgetRules";
import { ActualExpenseList } from "./ActualExpenseList";
import { BudgetSummary } from "./BudgetSummary";
import { ExpenseDistribution } from "./ExpenseDistribution";
import { ExpenseEntryForm } from "./ExpenseEntryForm";
import { PlannedExpenseList } from "./PlannedExpenseList";

type Props = { budgetItems: ExpenseItem[]; expenseAmount: string; expenseDate: string; expenseName: string; expenseNote: string; expensePayer: string; expenseType: ExpenseItem["type"]; expenseOccurrence: "actual" | "estimated"; expenses: LedgerItem[]; plans: ItineraryItem[]; relatedItineraryItemId: string; onAmountChange: (value: string) => void; onDateChange: (value: string) => void; onEditBudget: (id: string) => void; onEditExpense: (id: string) => void; onNameChange: (value: string) => void; onNoteChange: (value: string) => void; onPayerChange: (value: string) => void; onTypeChange: (type: ExpenseItem["type"]) => void; onOccurrenceChange: (value: "actual" | "estimated") => void; onRelatedItineraryChange: (value: string) => void; onRemoveBudget: (id: string) => void; onRemoveExpense: (id: string) => void; onSaveExpense: () => void; onToggleExpense: () => void; showExpense: boolean };

export function TripBudgetBoard({ budgetItems, expenseAmount, expenseDate, expenseName, expenseNote, expensePayer, expenseType, expenseOccurrence, expenses, onAmountChange, onDateChange, onEditBudget, onEditExpense, onNameChange, onNoteChange, onOccurrenceChange, onPayerChange, onRelatedItineraryChange, onRemoveBudget, onRemoveExpense, onSaveExpense, onToggleExpense, onTypeChange, plans, relatedItineraryItemId, showExpense }: Props) {
  const comparison = getBudgetVsActual(budgetItems, expenses);
  return <div className="budget-board" style={{ display: "flex", flexDirection: "column", height: 600, overflow: "hidden" }}>
    <BudgetSummary onToggleExpense={onToggleExpense} plannedTotal={comparison.plannedTotal} actualTotal={comparison.actualTotal} remaining={comparison.remaining} usageRate={comparison.usageRate} />
    {showExpense && <ExpenseEntryForm amount={expenseAmount} date={expenseDate} name={expenseName} note={expenseNote} payer={expensePayer} occurrence={expenseOccurrence} plans={plans} relatedItineraryItemId={relatedItineraryItemId} type={expenseType} onAmountChange={onAmountChange} onDateChange={onDateChange} onNameChange={onNameChange} onNoteChange={onNoteChange} onOccurrenceChange={onOccurrenceChange} onPayerChange={onPayerChange} onRelatedItineraryChange={onRelatedItineraryChange} onTypeChange={onTypeChange} onSave={onSaveExpense} />}
    <div className="budget-grid" style={{ display: "grid", flex: 1, gap: 16, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", minHeight: 0 }}>
      <ActualExpenseList expenses={expenses} onEdit={onEditExpense} onRemove={onRemoveExpense} plans={plans} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}><PlannedExpenseList items={budgetItems} onEdit={onEditBudget} onRemove={onRemoveBudget} plans={plans} /><ExpenseDistribution categories={comparison.categories} actualTotal={comparison.actualTotal} /></div>
    </div>
  </div>;
}
