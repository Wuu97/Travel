import type { ExpenseItem, ItineraryItem, LedgerItem } from "../model";
import { getBudgetOverview } from "../budgetRules";
import { ActualExpenseList } from "./ActualExpenseList";
import { BudgetSummary } from "./BudgetSummary";
import { ExpenseDistribution } from "./ExpenseDistribution";
import { ExpenseEntryForm } from "./ExpenseEntryForm";
import { PlannedExpenseList } from "./PlannedExpenseList";

type Props = { budgetItems: ExpenseItem[]; expenseAmount: string; expenseName: string; expenseType: ExpenseItem["type"]; expenseOccurrence: "actual" | "estimated"; expenses: LedgerItem[]; plans: ItineraryItem[]; relatedItineraryItemId: string; onAmountChange: (value: string) => void; onEditBudget: (id: string) => void; onEditExpense: (id: string) => void; onNameChange: (value: string) => void; onTypeChange: (type: ExpenseItem["type"]) => void; onOccurrenceChange: (value: "actual" | "estimated") => void; onRelatedItineraryChange: (value: string) => void; onRemoveBudget: (id: string) => void; onRemoveExpense: (id: string) => void; onSaveExpense: () => void; onToggleExpense: () => void; showExpense: boolean; total: number };

export function TripBudgetBoard({ budgetItems, expenseAmount, expenseName, expenseType, expenseOccurrence, expenses, onAmountChange, onEditBudget, onEditExpense, onNameChange, onOccurrenceChange, onRelatedItineraryChange, onRemoveBudget, onRemoveExpense, onSaveExpense, onToggleExpense, onTypeChange, plans, relatedItineraryItemId, showExpense, total }: Props) {
  const { plannedTotal } = getBudgetOverview(budgetItems, expenses);
  return <div className="budget-board" style={{ display: "flex", flexDirection: "column", height: 600, overflow: "hidden" }}>
    <BudgetSummary onToggleExpense={onToggleExpense} plannedTotal={plannedTotal} total={total} />
    {showExpense && <ExpenseEntryForm amount={expenseAmount} name={expenseName} occurrence={expenseOccurrence} plans={plans} relatedItineraryItemId={relatedItineraryItemId} type={expenseType} onAmountChange={onAmountChange} onNameChange={onNameChange} onOccurrenceChange={onOccurrenceChange} onRelatedItineraryChange={onRelatedItineraryChange} onTypeChange={onTypeChange} onSave={onSaveExpense} />}
    <div className="budget-grid" style={{ display: "grid", flex: 1, gap: 16, gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", minHeight: 0 }}>
      <ActualExpenseList expenses={expenses} onEdit={onEditExpense} onRemove={onRemoveExpense} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12, minHeight: 0 }}><PlannedExpenseList items={budgetItems} onEdit={onEditBudget} onRemove={onRemoveBudget} /><ExpenseDistribution expenses={expenses} total={total} /></div>
    </div>
  </div>;
}
