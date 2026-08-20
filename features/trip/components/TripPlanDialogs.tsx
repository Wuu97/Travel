import type { Dispatch, SetStateAction } from "react";
import type { ItineraryItem } from "../model";
import { ManualPlanDialog } from "./ManualPlanDialog";
import { PlanEditorDialog } from "./PlanEditorDialog";

type Props = { activeDay: number; days: Array<{ day: number; date: string }>; editingPlan: ItineraryItem | null; manualPlan: ItineraryItem | null; onSaveEdit: () => void; onSaveManual: () => void; setEditingPlan: Dispatch<SetStateAction<ItineraryItem | null>>; setManualPlan: Dispatch<SetStateAction<ItineraryItem | null>> };

/** Groups the mutually exclusive itinerary edit dialogs at the workspace boundary. */
export function TripPlanDialogs({ activeDay, days, editingPlan, manualPlan, onSaveEdit, onSaveManual, setEditingPlan, setManualPlan }: Props) {
  return <><PlanEditorDialog onClose={() => setEditingPlan(null)} onSave={onSaveEdit} plan={editingPlan} setPlan={setEditingPlan} /><ManualPlanDialog activeDay={activeDay} days={days} key={manualPlan?.id} onClose={() => setManualPlan(null)} onSave={onSaveManual} plan={manualPlan} setPlan={setManualPlan} /></>;
}
