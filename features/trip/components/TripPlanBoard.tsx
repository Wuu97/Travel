import type { RefObject } from "react";
import type { ItineraryItem } from "../model";
import { ItineraryEntryActions } from "./ItineraryEntryActions";
import { ItineraryCard } from "./ItineraryCard";
import { useTripPresentation } from "./TripCapabilities";

type InlineEdit = { id: string; field: "title" | "note" | "time" | "type"; value: string } | null;
type Props = { canEditTrip?: boolean; activeDay: number; inlineEdit: InlineEdit; inlineRef: RefObject<HTMLInputElement | null>; textareaRef: RefObject<HTMLTextAreaElement | null>; menuRef?: RefObject<HTMLDivElement | null>; newPlan: string; onAddPlan: () => void; onCopy?: (plan: ItineraryItem) => void; onDelete: (id: string) => void; onEdit?: (plan: ItineraryItem) => void; onInlineChange: (edit: InlineEdit) => void; onManualAdd: () => void; onNewPlanChange: (value: string) => void; onOptimize: () => void; onSaveInline: () => void; onToggleMenu?: (id: string) => void; openMenuId?: string | null; plans: ItineraryItem[]; timelineRef: RefObject<HTMLDivElement | null> };

export function TripPlanBoard({ canEditTrip = true, activeDay, inlineEdit, inlineRef, textareaRef, newPlan, onAddPlan, onDelete, onInlineChange, onManualAdd, onNewPlanChange, onOptimize, onSaveInline, plans, timelineRef }: Props) {
  const { editableStructure, interactionEnabled, permissionStatus } = useTripPresentation();
  const permitsPresentation = canEditTrip && editableStructure;
  const permitsInteraction = canEditTrip && interactionEnabled;
  const dayPlans = plans.filter((plan) => (plan.day ?? 1) === activeDay);
  return <div className="plan-board"><div className="timeline"><div className="timeline-list" ref={timelineRef}>{dayPlans.map((plan, index) => <ItineraryCard index={index} inlineEdit={inlineEdit} inlineRef={inlineRef} textareaRef={textareaRef} key={plan.id} onChangeInline={onInlineChange} onDelete={onDelete} onSaveInline={onSaveInline} plan={plan} />)}{!dayPlans.length && permitsPresentation && <button aria-disabled={permissionStatus === "loading"} type="button" className="empty-day" onClick={() => { if (permitsInteraction) onManualAdd(); }}>{activeDay === 0 ? "暂无待定行程。" : "这一天还没有安排，先添加一项行程吧。"}</button>}</div></div><ItineraryEntryActions canEditTrip={canEditTrip} idea={newPlan} onAddByAi={onAddPlan} onIdeaChange={onNewPlanChange} onManualAdd={onManualAdd} onOptimize={onOptimize} /></div>;
}
