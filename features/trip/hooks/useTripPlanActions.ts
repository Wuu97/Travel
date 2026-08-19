import type { Dispatch, SetStateAction } from "react";
import type { ItineraryItem } from "../model";
import { parsePlanInputs, sortItineraryItems } from "../utils";

type Options = { activeDay: number; editingPlan: ItineraryItem | null; manualPlan: ItineraryItem | null; newPlan: string; setActiveDay: (day: number) => void; setEditingPlan: Dispatch<SetStateAction<ItineraryItem | null>>; setManualPlan: Dispatch<SetStateAction<ItineraryItem | null>>; setNewPlan: (value: string) => void; setPendingPlanId: (id: string | null) => void; setPlans: Dispatch<SetStateAction<ItineraryItem[]>> };

/** Domain commands for itinerary creation, editing, copying, and deletion. */
export function useTripPlanActions({ activeDay, editingPlan, manualPlan, newPlan, setActiveDay, setEditingPlan, setManualPlan, setNewPlan, setPendingPlanId, setPlans }: Options) {
  const addPlan = () => {
    if (!newPlan.trim()) return;
    const timestamp = Date.now();
    const parsedPlans = parsePlanInputs(newPlan);
    setPlans((current) => sortItineraryItems([...current, ...parsedPlans.map((plan, index) => ({ id: `plan-${timestamp}-${index}`, ...plan, day: activeDay, creator: "你" }))]));
    setPendingPlanId(`plan-${timestamp}-${parsedPlans.length - 1}`);
    setNewPlan("");
  };
  const savePlan = () => {
    if (!editingPlan?.title.trim()) return;
    setPlans((current) => sortItineraryItems(current.map((plan) => plan.id === editingPlan.id ? { ...editingPlan, title: editingPlan.title.trim() } : plan)));
    setEditingPlan(null);
  };
  const deletePlan = (id: string) => {
    if (!window.confirm("确定删除这条行程吗？")) return;
    setPlans((current) => current.filter((plan) => plan.id !== id));
  };
  const copyPlan = (plan: ItineraryItem) => {
    const id = `plan-${Date.now()}`;
    setPlans((current) => sortItineraryItems([...current, { ...plan, id, title: `${plan.title}（副本）` }]));
    setPendingPlanId(id);
  };
  const openManualPlan = () => setManualPlan({ id: `plan-${Date.now()}`, title: "", type: "交通", time: "", day: activeDay, creator: "你" });
  const saveManualPlan = () => {
    if (!manualPlan?.title.trim()) return;
    setPlans((current) => sortItineraryItems([...current, { ...manualPlan, title: manualPlan.title.trim() }]));
    setActiveDay(manualPlan.day || activeDay);
    setPendingPlanId(manualPlan.id);
    setManualPlan(null);
  };
  return { addPlan, copyPlan, deletePlan, openManualPlan, saveManualPlan, savePlan };
}
