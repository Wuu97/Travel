import { useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TripWorkspaceProps } from "../components/TripWorkspace";
import { defaultTripDetails, getDefaultStoredTrip } from "../data";
import type { ExpenseItem, ItineraryItem, LedgerItem } from "../model";
import { clearTripStorage } from "../storage";
import { destinationPinyin, getTripDestination } from "../utils";
import { useExpenseEntry } from "./useExpenseEntry";
import { useInlinePlanEditor } from "./useInlinePlanEditor";
import { usePlanScroll } from "./usePlanScroll";
import { useSaveStatus } from "./useSaveStatus";
import { useTripBootstrap } from "./useTripBootstrap";
import { useTripDetailsActions } from "./useTripDetailsActions";
import { useTripImportSelection } from "./useTripImportSelection";
import { useTripImports } from "./useTripImports";
import { useTripLifecycle } from "./useTripLifecycle";
import { useTripPersistence } from "./useTripPersistence";
import { useTripPlanActions } from "./useTripPlanActions";
import { useTripSummary } from "./useTripSummary";
import { useTripWorkspaceView } from "./useTripWorkspaceView";
import { useWorkspaceOverlays } from "./useWorkspaceOverlays";

type ChatMessage = { role: "user" | "assistant"; content: string };
type Options = {
  accessToken: string | null;
  authReady: boolean;
  chatMessages: ChatMessage[];
  loadPersistedState: boolean;
  newChat: (prompt?: string) => void;
  setQuestion: Dispatch<SetStateAction<string>>;
};

function isConversationAboutDestination(messages: ChatMessage[], destination: string) {
  const conversation = messages.find((message) => message.role === "user")?.content.toLowerCase() || "";
  const destinationAlias = destinationPinyin[destination]?.toLowerCase();
  return conversation.includes(destination.toLowerCase()) || Boolean(destinationAlias && conversation.includes(destinationAlias));
}

/** Composes trip state, effects, and commands for the workspace presentation boundary. */
export function useTripWorkspaceController({
  accessToken,
  authReady,
  chatMessages,
  loadPersistedState,
  newChat,
  setQuestion,
}: Options) {
  const { initialDetails, initialTrip, tripId } = useTripBootstrap(loadPersistedState);
  const [tripDetails, setTripDetails] = useState(initialDetails);
  const [expenses, setExpenses] = useState<LedgerItem[]>(initialTrip.expenses);
  const [budgetItems, setBudgetItems] = useState<ExpenseItem[]>(initialTrip.budgetItems);
  const [plans, setPlans] = useState<ItineraryItem[]>(initialTrip.plans);
  const tripDestination = getTripDestination(tripDetails.title);
  const planMenuRef = useRef<HTMLDivElement>(null);
  const timelineListRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const inlineTitleInputRef = useRef<HTMLInputElement>(null);
  const inlinePlanInputRef = useRef<HTMLInputElement>(null);
  const inlinePlanTextareaRef = useRef<HTMLTextAreaElement>(null);
  const tripPopoverRef = useRef<HTMLDivElement>(null);
  const memberRoleRef = useRef<HTMLDivElement>(null);
  const { announceSave, saveStatus } = useSaveStatus();
  const { days: tripDays } = useTripSummary(tripDetails, expenses);
  const workspaceView = useTripWorkspaceView();
  const {
    activeDay,
    editingMemberRole,
    editingPlan,
    inlinePlanEdit,
    inlineTripTitle,
    manualPlan,
    newMember,
    newPlan,
    openPlanMenuId,
    pendingPlanScrollId,
    setActiveDay,
    setEditingMemberRole,
    setEditingPlan,
    setInlinePlanEdit,
    setInlineTripTitle,
    setManualPlan,
    setNewMember,
    setNewPlan,
    setOpenPlanMenuId,
    setPendingPlanScrollId,
    setShareStatus,
    setShared,
    setTripPopover,
    setWorkspaceTab,
    shareStatus,
    shared,
    tripPopover,
    workspaceTab,
  } = workspaceView;
  const {
    amount: ledgerAmount,
    editing: ledgerEditing,
    name: ledgerName,
    occurrence: ledgerOccurrence,
    relatedItineraryItemId: ledgerRelatedItineraryItemId,
    type: ledgerType,
    visible: ledgerVisible,
    setAmount: setLedgerAmount,
    setEditing: setLedgerEditing,
    setName: setLedgerName,
    setOccurrence: setLedgerOccurrence,
    setRelatedItineraryItemId: setLedgerRelatedItineraryItemId,
    setType: setLedgerType,
    setVisible: setLedgerVisible,
  } = workspaceView.ledger;
  const { disableRemoteSync, syncError } = useTripPersistence({
    accessToken,
    authReady,
    budgetItems,
    details: tripDetails,
    enabled: loadPersistedState,
    expenses,
    plans,
    setBudgetItems,
    setDetails: setTripDetails,
    setExpenses,
    setPlans,
    tripId,
  });
  const {
    addExpenseItems,
    addItineraryItems,
    isExpenseAdded,
    isPlanAdded,
  } = useTripImports({
    budgetItems,
    expenses,
    plans,
    setBudgetItems,
    setExpenses,
    setPlans,
  });
  const { selectedImports, toggleImport } = useTripImportSelection();
  const {
    addPlan,
    copyPlan,
    deletePlan,
    movePlanToDay,
    openManualPlan,
    saveManualPlan,
    savePlan,
  } = useTripPlanActions({
    activeDay,
    city: tripDestination,
    editingPlan,
    manualPlan,
    newPlan,
    setActiveDay,
    setEditingPlan,
    setManualPlan,
    setNewPlan,
    setPendingPlanId: setPendingPlanScrollId,
    setPlans,
  });
  const { addExpense, editExpense, removeBudgetItem, removeExpense } =
    useExpenseEntry({
      amount: ledgerAmount,
      budgetItems,
      editingExpense: ledgerEditing,
      expenses,
      name: ledgerName,
      occurrence: ledgerOccurrence,
      plans,
      relatedItineraryItemId: ledgerRelatedItineraryItemId,
      type: ledgerType,
      setAmount: setLedgerAmount,
      setBudgetItems,
      setEditingExpense: setLedgerEditing,
      setExpenses,
      setName: setLedgerName,
      setOccurrence: setLedgerOccurrence,
      setRelatedItineraryItemId: setLedgerRelatedItineraryItemId,
      setType: setLedgerType,
      setVisible: setLedgerVisible,
    });
  const { chooseCoverImage, saveInlineTitle, updateTripDetails } =
    useTripDetailsActions({
      activeDay,
      announceSave,
      inlineTitle: inlineTripTitle,
      setActiveDay,
      setDetails: setTripDetails,
      setInlineTitle: setInlineTripTitle,
      setPlans,
    });
  const { archiveTrip, copyInviteLink, deleteTrip } = useTripLifecycle({
    accessToken,
    disableRemoteSync,
    onClosePopover: () => setTripPopover(null),
    onReset: () => {
      const fallback = getDefaultStoredTrip();
      clearTripStorage();
      setExpenses(fallback.expenses);
      setBudgetItems(fallback.budgetItems);
      setPlans(fallback.plans);
      setTripDetails(defaultTripDetails);
      setWorkspaceTab("plan");
      setActiveDay(1);
    },
    onStatusChange: updateTripDetails,
    setShareStatus,
    setShared,
    tripId,
  });
  const { saveInlinePlan } = useInlinePlanEditor({
    announceSave,
    edit: inlinePlanEdit,
    setEdit: setInlinePlanEdit,
    setPlans,
  });
  usePlanScroll({
    activeDay,
    pendingPlanId: pendingPlanScrollId,
    plans,
    setPendingPlanId: setPendingPlanScrollId,
    timelineRef: timelineListRef,
  });
  useWorkspaceOverlays({
    editingMemberRole,
    inlineTitleInputRef,
    inlinePlanInputRef,
    inlinePlanTextareaRef,
    inlinePlanEdit,
    inlineTripTitle,
    memberRoleRef,
    onCloseMemberRole: () => setEditingMemberRole(null),
    onClosePlanMenu: () => setOpenPlanMenuId(null),
    onCloseTripPopover: () => setTripPopover(null),
    openPlanMenuId,
    planMenuRef,
    tripPopover,
    tripPopoverRef,
  });
  const copyActivePlan = (item: ItineraryItem) => {
    copyPlan(item);
    setOpenPlanMenuId(null);
  };
  const deleteActivePlan = (id: string) => {
    void deletePlan(id);
    setOpenPlanMenuId(null);
  };
  const editActivePlan = (item: ItineraryItem) => {
    setEditingPlan({ ...item, day: item.day ?? activeDay });
    setOpenPlanMenuId(null);
  };
  const optimizeActiveDay = () => {
    const route = plans
      .filter((plan) => (plan.day ?? 1) === activeDay)
      .map((plan) => `${plan.time || "待定"} ${plan.title}`)
      .join("；");
    const prompt = `请优化${tripDestination} DAY ${activeDay} 的路线。现有安排：${route || "暂无安排"}`;
    if (
      chatMessages.length &&
      !isConversationAboutDestination(chatMessages, tripDestination)
    ) {
      newChat(prompt);
    } else {
      setQuestion(prompt);
    }
    document.querySelector("#ai")?.scrollIntoView({ behavior: "smooth" });
  };
  const togglePlanMenu = (id: string) =>
    setOpenPlanMenuId((current) => (current === id ? null : id));
  const toggleExpense = () => setLedgerVisible(!ledgerVisible);
  const workspaceProps: TripWorkspaceProps = {
    activeDay,
    budgetItems,
    coverInputRef,
    days: tripDays,
    details: tripDetails,
    editingPlan,
    editingRole: editingMemberRole,
    expenseAmount: ledgerAmount,
    expenseName: ledgerName,
    expenseOccurrence: ledgerOccurrence,
    expenseType: ledgerType,
    expenses,
    inlineEdit: inlinePlanEdit,
    inlinePlanInputRef,
    inlinePlanTextareaRef,
    inlineTitleInputRef,
    inlineTitle: inlineTripTitle,
    manualPlan,
    memberRoleRef,
    menuRef: planMenuRef,
    newMember,
    newPlan,
    onAddPlan: addPlan,
    onAmountChange: setLedgerAmount,
    onArchive: archiveTrip,
    onCoverChange: chooseCoverImage,
    onCopy: copyActivePlan,
    onDelete: deleteActivePlan,
    onDeleteTrip: () => void deleteTrip(),
    onDetailsChange: updateTripDetails,
    onEdit: editActivePlan,
    onEditBudget: (id) => editExpense(id, "estimated"),
    onEditExpense: (id) => editExpense(id, "actual"),
    onInlineChange: setInlinePlanEdit,
    onInvite: copyInviteLink,
    onManualAdd: openManualPlan,
    onMovePlan: movePlanToDay,
    onNameChange: setLedgerName,
    onNewPlanChange: setNewPlan,
    onOccurrenceChange: setLedgerOccurrence,
    onOptimize: optimizeActiveDay,
    onRelatedItineraryChange: setLedgerRelatedItineraryItemId,
    onRemoveBudget: removeBudgetItem,
    onRemoveExpense: removeExpense,
    onSaveEdit: savePlan,
    onSaveExpense: addExpense,
    onSaveInline: saveInlinePlan,
    onSaveManual: saveManualPlan,
    onSelectDay: setActiveDay,
    onSelectTab: setWorkspaceTab,
    onTitleChange: setInlineTripTitle,
    onTitleSave: saveInlineTitle,
    onToggleExpense: toggleExpense,
    onToggleMenu: togglePlanMenu,
    onTypeChange: setLedgerType,
    openMenuId: openPlanMenuId,
    plans,
    popover: tripPopover,
    relatedItineraryItemId: ledgerRelatedItineraryItemId,
    saveStatus,
    setEditingPlan,
    setEditingRole: setEditingMemberRole,
    setManualPlan,
    setNewMember,
    setPopover: setTripPopover,
    shared,
    shareStatus,
    showExpense: ledgerVisible,
    timelineRef: timelineListRef,
    tripPopoverRef,
    workspaceTab,
  };
  const importContext = {
    addExpenseItems,
    addItineraryItems,
    isExpenseAdded,
    isPlanAdded,
    selectedImports,
    toggleImport,
  };

  return {
    syncError,
    workspaceProps,
    importContext,
    travelContext: tripDestination ? {
      city: tripDestination,
      destination: tripDestination,
      trip: {
        days: tripDays.length,
        startDate: tripDetails.startDate,
        endDate: tripDetails.endDate,
        travelers: tripDetails.companions.length,
      },
    } : undefined,
  };
}
