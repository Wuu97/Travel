import type { RefObject } from "react";
import type { ItineraryItem } from "../model";
import { ItineraryEntryActions } from "./ItineraryEntryActions";
import { ItineraryTimelineHeader } from "./ItineraryTimelineHeader";
import { ItineraryCard } from "./ItineraryCard";

type InlineEdit = { id: string; field: "title" | "note" | "time" | "type"; value: string } | null;
type Props = { activeDay: number; inlineEdit: InlineEdit; inlineRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>; menuRef: RefObject<HTMLDivElement | null>; newPlan: string; onAddPlan: () => void; onCopy: (plan: ItineraryItem) => void; onDelete: (id: string) => void; onEdit: (plan: ItineraryItem) => void; onInlineChange: (edit: InlineEdit) => void; onManualAdd: () => void; onNewPlanChange: (value: string) => void; onOptimize: () => void; onSaveInline: () => void; onToggleMenu: (id: string) => void; openMenuId: string | null; plans: ItineraryItem[]; timelineRef: RefObject<HTMLDivElement | null> };

export function TripPlanBoard({ activeDay, inlineEdit, inlineRef, menuRef, newPlan, onAddPlan, onCopy, onDelete, onEdit, onInlineChange, onManualAdd, onNewPlanChange, onOptimize, onSaveInline, onToggleMenu, openMenuId, plans, timelineRef }: Props) {
  const dayPlans = plans.filter((plan) => (plan.day || 1) === activeDay);
  return <div className="plan-board"><div className="timeline"><ItineraryTimelineHeader day={activeDay} onOptimize={onOptimize} /><div className="timeline-list" ref={timelineRef}>{dayPlans.map((plan, index) => <ItineraryCard index={index} inlineEdit={inlineEdit} inlineRef={inlineRef} isMenuOpen={openMenuId === plan.id} key={plan.id} menuRef={menuRef} onChangeInline={onInlineChange} onCopy={onCopy} onDelete={onDelete} onEdit={onEdit} onSaveInline={onSaveInline} onToggleMenu={() => onToggleMenu(plan.id)} plan={plan} />)}{!dayPlans.length && <button type="button" className="empty-day" onClick={onManualAdd}>这一天还没有安排，先添加一项行程吧。</button>}</div><ItineraryEntryActions idea={newPlan} onAddByAi={onAddPlan} onIdeaChange={onNewPlanChange} onManualAdd={onManualAdd} /></div></div>;
}
