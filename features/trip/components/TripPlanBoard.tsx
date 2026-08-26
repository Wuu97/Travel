import type { RefObject } from "react";
import type { ExpenseItem, ItineraryItem, LedgerItem } from "../model";
import { getItineraryExpenseSummary } from "../expenseRelations";
import { ItineraryEntryActions } from "./ItineraryEntryActions";
import { ItineraryCard } from "./ItineraryCard";

type InlineEdit = { id: string; field: "title" | "note" | "time" | "type"; value: string } | null;
type Props = { canEditTrip?: boolean; activeDay: number; budgetItems: ExpenseItem[]; expenses: LedgerItem[]; inlineEdit: InlineEdit; inlineRef: RefObject<HTMLInputElement | null>; textareaRef: RefObject<HTMLTextAreaElement | null>; menuRef: RefObject<HTMLDivElement | null>; newPlan: string; onAddPlan: () => void; onCopy: (plan: ItineraryItem) => void; onDelete: (id: string) => void; onEdit: (plan: ItineraryItem) => void; onInlineChange: (edit: InlineEdit) => void; onManualAdd: () => void; onNewPlanChange: (value: string) => void; onOptimize: () => void; onSaveInline: () => void; onToggleMenu: (id: string) => void; onViewExpenses: () => void; openMenuId: string | null; plans: ItineraryItem[]; timelineRef: RefObject<HTMLDivElement | null> };

export function TripPlanBoard({ canEditTrip = true, activeDay, budgetItems, expenses, inlineEdit, inlineRef, textareaRef, menuRef, newPlan, onAddPlan, onCopy, onDelete, onEdit, onInlineChange, onManualAdd, onNewPlanChange, onOptimize, onSaveInline, onToggleMenu, onViewExpenses, openMenuId, plans, timelineRef }: Props) {
  const dayPlans = plans.filter((plan) => (plan.day ?? 1) === activeDay);
  return <div className="plan-board"><div className="timeline"><div className="timeline-list" ref={timelineRef}>{dayPlans.map((plan, index) => <ItineraryCard expenseSummary={getItineraryExpenseSummary(plan.id, budgetItems, expenses)} index={index} inlineEdit={inlineEdit} inlineRef={inlineRef} textareaRef={textareaRef} isMenuOpen={canEditTrip && openMenuId === plan.id} key={plan.id} menuRef={menuRef} onChangeInline={onInlineChange} onCopy={onCopy} onDelete={onDelete} onEdit={onEdit} onSaveInline={onSaveInline} onToggleMenu={() => canEditTrip && onToggleMenu(plan.id)} onViewExpenses={onViewExpenses} plan={plan} />)}{!dayPlans.length && canEditTrip && <button type="button" className="empty-day" onClick={onManualAdd}>{activeDay === 0 ? "暂无待定行程。" : "这一天还没有安排，先添加一项行程吧。"}</button>}</div></div><ItineraryEntryActions canEditTrip={canEditTrip} idea={newPlan} onAddByAi={onAddPlan} onIdeaChange={onNewPlanChange} onManualAdd={onManualAdd} onOptimize={onOptimize} /></div>;
}
