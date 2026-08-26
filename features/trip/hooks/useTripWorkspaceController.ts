import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TripWorkspaceProps } from "../components/TripWorkspace";
import { defaultTripDetails, getDefaultStoredTrip } from "../data";
import type { ExpenseItem, ItineraryItem, LedgerItem } from "../model";
import { clearTripStorage, hasStoredTripSnapshot, loadStoredTrip, loadTripDetails, loadTripLibrary } from "../storage";
import { syncExpenseRelationTitle } from "../expenseRelations";
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
  storageScope: string;
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
  storageScope,
}: Options) {
  const { initialDetails, initialTrip, tripId } = useTripBootstrap(loadPersistedState, storageScope);
  const [hydratedStorageScope, setHydratedStorageScope] = useState(storageScope);
  const hasPersistedTripInScope = useCallback(() => storageScope === "guest" || hasStoredTripSnapshot(tripId, storageScope) || loadTripLibrary(storageScope).some((trip) => trip.id === tripId), [storageScope, tripId]);
  const [hasPersistedTrip, setHasPersistedTrip] = useState(hasPersistedTripInScope);
  const markRemoteTripLoaded = useCallback(() => setHasPersistedTrip(true), []);
  const [tripDetails, setTripDetails] = useState(initialDetails);
  const [expenses, setExpenses] = useState<LedgerItem[]>(initialTrip.expenses);
  const [budgetItems, setBudgetItems] = useState<ExpenseItem[]>(initialTrip.budgetItems);
  const [plans, setPlans] = useState<ItineraryItem[]>(initialTrip.plans);
  useEffect(() => {
    if (!loadPersistedState) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const trip = loadStoredTrip(getDefaultStoredTrip(), tripId, storageScope);
      setExpenses(trip.expenses);
      setBudgetItems(trip.budgetItems);
      setPlans(trip.plans);
      setTripDetails(loadTripDetails(defaultTripDetails, tripId, storageScope));
      setHasPersistedTrip(hasPersistedTripInScope());
      setHydratedStorageScope(storageScope);
    });
    return () => { cancelled = true; };
  }, [hasPersistedTripInScope, loadPersistedState, storageScope, tripId]);
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
    date: ledgerDate,
    editing: ledgerEditing,
    name: ledgerName,
    note: ledgerNote,
    occurrence: ledgerOccurrence,
    payer: ledgerPayer,
    relatedItineraryItemId: ledgerRelatedItineraryItemId,
    type: ledgerType,
    visible: ledgerVisible,
    setAmount: setLedgerAmount,
    setDate: setLedgerDate,
    setEditing: setLedgerEditing,
    setName: setLedgerName,
    setNote: setLedgerNote,
    setOccurrence: setLedgerOccurrence,
    setPayer: setLedgerPayer,
    setRelatedItineraryItemId: setLedgerRelatedItineraryItemId,
    setType: setLedgerType,
    setVisible: setLedgerVisible,
  } = workspaceView.ledger;
  const { disableRemoteSync, syncError } = useTripPersistence({
    accessToken,
    authReady,
    budgetItems,
    details: tripDetails,
    enabled: loadPersistedState && hydratedStorageScope === storageScope,
    onRemoteTripLoaded: markRemoteTripLoaded,
    persistLocal: hasPersistedTrip,
    expenses,
    plans,
    setBudgetItems,
    setDetails: setTripDetails,
    setExpenses,
    setPlans,
    storageScope,
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
  const { selectedImports, toggleImport, toggleImports } = useTripImportSelection();
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
    setBudgetItems,
    setEditingPlan,
    setExpenses,
    setManualPlan,
    setNewPlan,
    setPendingPlanId: setPendingPlanScrollId,
    setPlans,
  });
  const { addExpense, editExpense, removeBudgetItem, removeExpense } =
    useExpenseEntry({
      amount: ledgerAmount,
      date: ledgerDate,
      payer: ledgerPayer,
      note: ledgerNote,
      budgetItems,
      editingExpense: ledgerEditing,
      expenses,
      name: ledgerName,
      occurrence: ledgerOccurrence,
      plans,
      relatedItineraryItemId: ledgerRelatedItineraryItemId,
      type: ledgerType,
      setAmount: setLedgerAmount,
      setDate: setLedgerDate,
      setPayer: setLedgerPayer,
      setNote: setLedgerNote,
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
      clearTripStorage(tripId, storageScope);
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
    onPlanRenamed: (plan) => {
      setBudgetItems((items) => syncExpenseRelationTitle(items, plan));
      setExpenses((items) => syncExpenseRelationTitle(items, plan));
    },
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
  const viewPlanExpenses = () => setWorkspaceTab("budget");
  const togglePlanMenu = (id: string) =>
    setOpenPlanMenuId((current) => (current === id ? null : id));
  const toggleExpense = () => setLedgerVisible(!ledgerVisible);
  const workspaceProps: TripWorkspaceProps = {
    accessToken,
    activeDay,
    authReady,
    budgetItems,
    coverInputRef,
    days: tripDays,
    details: tripDetails,
    editingPlan,
    editingRole: editingMemberRole,
    expenseAmount: ledgerAmount,
    expenseDate: ledgerDate,
    expenseName: ledgerName,
    expenseNote: ledgerNote,
    expensePayer: ledgerPayer,
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
    onDateChange: setLedgerDate,
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
    onNoteChange: setLedgerNote,
    onNewPlanChange: setNewPlan,
    onOccurrenceChange: setLedgerOccurrence,
    onPayerChange: setLedgerPayer,
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
    onViewPlanExpenses: viewPlanExpenses,
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
    storageScope,
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
    toggleImports,
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
