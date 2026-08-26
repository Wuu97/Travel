import type { Dispatch, SetStateAction } from "react";
import { lookupPlaceCategory } from "../../places/api";
import { createId } from "../../shared/utils/createId";
import { useConfirmation } from "../../shared/components/ConfirmDialog";
import type { ExpenseItem, ItineraryItem, LedgerItem } from "../model";
import { clearExpenseRelation, syncExpenseRelationTitle } from "../expenseRelations";
import { parsePlanInputs, sortItineraryItems } from "../utils";

type Options = { activeDay: number; city?: string; editingPlan: ItineraryItem | null; manualPlan: ItineraryItem | null; newPlan: string; setActiveDay: (day: number) => void; setBudgetItems: Dispatch<SetStateAction<ExpenseItem[]>>; setEditingPlan: Dispatch<SetStateAction<ItineraryItem | null>>; setExpenses: Dispatch<SetStateAction<LedgerItem[]>>; setManualPlan: Dispatch<SetStateAction<ItineraryItem | null>>; setNewPlan: (value: string) => void; setPendingPlanId: (id: string | null) => void; setPlans: Dispatch<SetStateAction<ItineraryItem[]>> };

/** Domain commands for itinerary creation, editing, copying, and deletion. */
export function useTripPlanActions({ activeDay, city, editingPlan, manualPlan, newPlan, setActiveDay, setBudgetItems, setEditingPlan, setExpenses, setManualPlan, setNewPlan, setPendingPlanId, setPlans }: Options) {
  const { confirm } = useConfirmation();
  const addPlan = () => {
    if (!newPlan.trim()) return;
    const parsedPlans = parsePlanInputs(newPlan).map((plan) => ({ id: createId("plan"), ...plan, day: activeDay, creator: "你" }));
    setPlans((current) => sortItineraryItems([...current, ...parsedPlans]));
    setPendingPlanId(parsedPlans.at(-1)!.id);
    setNewPlan("");

    void Promise.all(parsedPlans.map(async (plan) => ({ id: plan.id, result: await lookupPlaceCategory(plan.title, city) })))
      .then((lookups) => {
        const results = new Map(lookups.flatMap(({ id, result }) => result?.confidence === "high" ? [[id, result] as const] : []));
        if (!results.size) return;
        setPlans((current) => sortItineraryItems(current.map((plan) => {
          const result = results.get(plan.id);
          return result ? { ...plan, ...(plan.type === "其他" ? { type: result.category } : {}), ...(result.place ? { place: result.place } : {}) } : plan;
        })));
      });
  };
  const savePlan = () => {
    if (!editingPlan?.title.trim()) return;
    const savedPlan = { ...editingPlan, title: editingPlan.title.trim() };
    setPlans((current) => sortItineraryItems(current.map((plan) => plan.id === savedPlan.id ? savedPlan : plan)));
    setBudgetItems((items) => syncExpenseRelationTitle(items, savedPlan));
    setExpenses((items) => syncExpenseRelationTitle(items, savedPlan));
    setEditingPlan(null);
  };
  const deletePlan = async (id: string) => {
    if (!await confirm({ title: "删除行程？", description: "这条行程将被永久删除，且无法恢复。" })) return;
    setPlans((current) => current.filter((plan) => plan.id !== id));
    setBudgetItems((items) => clearExpenseRelation(items, id));
    setExpenses((items) => clearExpenseRelation(items, id));
  };
  const copyPlan = (plan: ItineraryItem) => {
    const id = createId("plan");
    setPlans((current) => sortItineraryItems([...current, { ...plan, id, title: `${plan.title}（副本）` }]));
    setPendingPlanId(id);
  };
  const movePlanToDay = (id: string, day: number) => {
    const targetDay = Math.max(0, Math.min(31, day));
    setPlans((current) => sortItineraryItems(current.map((plan) => plan.id === id ? { ...plan, day: targetDay } : plan)));
    setActiveDay(targetDay);
    setPendingPlanId(id);
  };
  const openManualPlan = () => setManualPlan({ id: createId("plan"), title: "", type: "交通", time: "", day: activeDay, creator: "你" });
  const saveManualPlan = () => {
    if (!manualPlan?.title.trim()) return;
    const savedPlan = { ...manualPlan, title: manualPlan.title.trim() };
    setPlans((current) => sortItineraryItems([...current, savedPlan]));
    setActiveDay(savedPlan.day ?? activeDay);
    setPendingPlanId(savedPlan.id);
    setManualPlan(null);

    void lookupPlaceCategory(savedPlan.location || savedPlan.title, city).then((result) => {
      if (!result?.place) return;
      setPlans((current) => current.map((plan) => plan.id === savedPlan.id ? { ...plan, place: result.place } : plan));
    });
  };
  return { addPlan, copyPlan, deletePlan, movePlanToDay, openManualPlan, saveManualPlan, savePlan };
}
