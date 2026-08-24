import { useEffect, useState } from "react";
import type { ExpenseItem, ItineraryItem } from "../model";

type InlinePlanEdit = {
  id: string;
  field: "title" | "note" | "time" | "type";
  value: string;
};

export type TripPopover = "status" | "dates" | "members" | "settings" | null;
export type EditingExpense = { id: string; occurrence: "actual" | "estimated" } | null;

/** UI-only state for the trip workspace. Domain data remains outside this hook. */
export function useTripWorkspaceView() {
  const [workspaceTab, setWorkspaceTab] = useState<"plan" | "budget">("plan");
  // Keep the first server and client render deterministic; read the URL only
  // after hydration to prevent a selected-day mismatch in SSR output.
  const [activeDay, setActiveDay] = useState(1);
  const [shared, setShared] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [showExpense, setShowExpense] = useState(false);
  const [expenseName, setExpenseName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseType, setExpenseType] = useState<ExpenseItem["type"]>("其他");
  const [expenseOccurrence, setExpenseOccurrence] = useState<"actual" | "estimated">("actual");
  const [relatedItineraryItemId, setRelatedItineraryItemId] = useState("");
  const [editingExpense, setEditingExpense] = useState<EditingExpense>(null);
  const [newPlan, setNewPlan] = useState("");
  const [editingPlan, setEditingPlan] = useState<ItineraryItem | null>(null);
  const [manualPlan, setManualPlan] = useState<ItineraryItem | null>(null);
  const [inlineTripTitle, setInlineTripTitle] = useState<string | null>(null);
  const [inlinePlanEdit, setInlinePlanEdit] = useState<InlinePlanEdit | null>(null);
  const [tripPopover, setTripPopover] = useState<TripPopover>(null);
  const [editingMemberRole, setEditingMemberRole] = useState<string | null>(null);
  const [newMember, setNewMember] = useState("");
  const [openPlanMenuId, setOpenPlanMenuId] = useState<string | null>(null);
  const [pendingPlanScrollId, setPendingPlanScrollId] = useState<string | null>(null);

  const ledger = {
    amount: expenseAmount, editing: editingExpense, name: expenseName, occurrence: expenseOccurrence,
    relatedItineraryItemId, type: expenseType, visible: showExpense,
    setAmount: setExpenseAmount, setEditing: setEditingExpense, setName: setExpenseName,
    setOccurrence: setExpenseOccurrence, setRelatedItineraryItemId, setType: setExpenseType, setVisible: setShowExpense,
  };
  const plan = {
    activeDay, editing: editingPlan, inlineEdit: inlinePlanEdit, manual: manualPlan, newPlan,
    openMenuId: openPlanMenuId, pendingScrollId: pendingPlanScrollId,
    setActiveDay, setEditing: setEditingPlan, setInlineEdit: setInlinePlanEdit, setManual: setManualPlan,
    setNewPlan, setOpenMenuId: setOpenPlanMenuId, setPendingScrollId: setPendingPlanScrollId,
  };
  const sharing = { shared, shareStatus, setShared, setShareStatus };

  useEffect(() => {
    window.sessionStorage.setItem("tuyu-workspace-tab", workspaceTab);
  }, [workspaceTab]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (window.sessionStorage.getItem("tuyu-workspace-tab") === "budget") setWorkspaceTab("budget");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const value = Number(new URLSearchParams(window.location.search).get("day"));
    if (!Number.isInteger(value) || value < 0) return;
    const timer = window.setTimeout(() => setActiveDay(value), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return {
    ledger, plan, sharing,
    activeDay, editingExpense, editingMemberRole, editingPlan, expenseAmount, expenseName, expenseType, expenseOccurrence, relatedItineraryItemId,
    inlinePlanEdit, inlineTripTitle, manualPlan, newMember, newPlan,
    openPlanMenuId, pendingPlanScrollId, setActiveDay,
    setEditingExpense, setEditingMemberRole, setEditingPlan, setExpenseAmount, setExpenseName, setExpenseType, setExpenseOccurrence, setRelatedItineraryItemId,
    setInlinePlanEdit, setInlineTripTitle, setManualPlan, setNewMember,
    setNewPlan, setOpenPlanMenuId, setPendingPlanScrollId,
    setShareStatus, setShared, setShowExpense, setTripPopover, setWorkspaceTab,
    shareStatus, shared, showExpense, tripPopover, workspaceTab,
  };
}
