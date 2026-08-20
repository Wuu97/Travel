import type { RefObject } from "react";
import type { ItineraryItem } from "../model";
import { ItineraryEntryActions } from "./ItineraryEntryActions";
import { ItineraryTimelineHeader } from "./ItineraryTimelineHeader";
import { ItineraryCard } from "./ItineraryCard";
import { TripDayNavigation } from "./TripDayNavigation";

type InlineEdit = { id: string; field: "title" | "note" | "time" | "type"; value: string } | null;
type Props = { activeDay: number; days: Array<{ day: number; date: string }>; inlineEdit: InlineEdit; inlineRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>; menuRef: RefObject<HTMLDivElement | null>; newPlan: string; onAddPlan: () => void; onCopy: (plan: ItineraryItem) => void; onDelete: (id: string) => void; onEdit: (plan: ItineraryItem) => void; onInlineChange: (edit: InlineEdit) => void; onManualAdd: () => void; onMovePlan: (id: string, day: number) => void; onNewPlanChange: (value: string) => void; onOptimize: () => void; onSaveInline: () => void; onSelectDay: (day: number) => void; onToggleMenu: (id: string) => void; openMenuId: string | null; plans: ItineraryItem[]; timelineRef: RefObject<HTMLDivElement | null> };

export function TripPlanBoard({ activeDay, days, inlineEdit, inlineRef, menuRef, newPlan, onAddPlan, onCopy, onDelete, onEdit, onInlineChange, onManualAdd, onMovePlan, onNewPlanChange, onOptimize, onSaveInline, onSelectDay, onToggleMenu, openMenuId, plans, timelineRef }: Props) {
  const dayPlans = plans.filter((plan) => (plan.day || 1) === activeDay);
  return <div className="plan-board" style={{ height: 600 }}><TripDayNavigation activeDay={activeDay} days={days} onMovePlan={onMovePlan} onSelectDay={onSelectDay} /><div className="timeline"><ItineraryTimelineHeader day={activeDay} onOptimize={onOptimize} /><div className="timeline-list" ref={timelineRef}>{dayPlans.map((plan, index) => <ItineraryCard index={index} inlineEdit={inlineEdit} inlineRef={inlineRef} isMenuOpen={openMenuId === plan.id} key={plan.id} menuRef={menuRef} onChangeInline={onInlineChange} onCopy={onCopy} onDelete={onDelete} onEdit={onEdit} onSaveInline={onSaveInline} onToggleMenu={() => onToggleMenu(plan.id)} plan={plan} />)}{!dayPlans.length && <p className="empty-day" onClick={onManualAdd} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onManualAdd(); } }} role="button" tabIndex={0}>这一天还没有安排，先添加一项行程吧。</p>}</div><ItineraryEntryActions idea={newPlan} onAddByAi={onAddPlan} onIdeaChange={onNewPlanChange} onManualAdd={onManualAdd} /></div></div>;
}
