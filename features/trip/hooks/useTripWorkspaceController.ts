import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TripWorkspaceProps } from "../components/TripWorkspace";
import { defaultTripDetails, getDefaultStoredTrip } from "../data";
import type { ExpenseItem, ItineraryItem, LedgerItem, TripLibraryItem } from "../model";
import { hasStoredTripSnapshot, loadStoredTrip, loadTripDetails, loadTripLibrary, migrateGuestTripLibrary, saveTrip, saveTripDetails, saveTripLibrary } from "../storage";
import { DEFAULT_TRIP_ID } from "../tripId";
import { createId } from "../../shared/utils/createId";
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
import { listTripMembers } from "../api";
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
  const isAuthenticated = authReady && Boolean(accessToken);
  const hasTripInUrl = typeof window !== "undefined" && Boolean(new URLSearchParams(window.location.search).get("trip"));
  const requiresMembershipResolution = Boolean(accessToken && hasTripInUrl && tripId !== DEFAULT_TRIP_ID);
  const [activatedTripId, setActivatedTripId] = useState<string | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [canEditTrip, setCanEditTrip] = useState(() => !requiresMembershipResolution);
  const [canManageMembers, setCanManageMembers] = useState(() => !requiresMembershipResolution);
  const [canDeleteTrip, setCanDeleteTrip] = useState(() => !requiresMembershipResolution);
  const [capabilityTripId, setCapabilityTripId] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<"loading" | "ready" | "error">("ready");
  const activeRealTripId = activatedTripId || (hasTripInUrl && tripId !== DEFAULT_TRIP_ID ? tripId : null);
  const membershipPending = Boolean(accessToken && activeRealTripId) && capabilityTripId !== activeRealTripId;
  const safeCanEditTrip = membershipPending ? false : canEditTrip;
  const safeCanManageMembers = membershipPending ? false : canManageMembers;
  const safeCanDeleteTrip = membershipPending ? false : canDeleteTrip;
  const [hydratedStorageScope, setHydratedStorageScope] = useState(storageScope);
  // The default workspace is only a presentation fallback. It must never become
  // a persisted guest trip simply because the library is empty.
  const hasPersistedTripInScope = useCallback(() => hasStoredTripSnapshot(tripId, storageScope) || loadTripLibrary(storageScope).some((trip) => trip.id === tripId), [storageScope, tripId]);
  const [hasPersistedTrip, setHasPersistedTrip] = useState(hasPersistedTripInScope);
  const markRemoteTripLoaded = useCallback(() => setHasPersistedTrip(true), []);
  const [tripDetails, setTripDetails] = useState(initialDetails);
  const [expenses, setExpenses] = useState<LedgerItem[]>(initialTrip.expenses);
  const [budgetItems, setBudgetItems] = useState<ExpenseItem[]>(initialTrip.budgetItems);
  const [plans, setPlans] = useState<ItineraryItem[]>(initialTrip.plans);
  const [lastImportBatch, setLastImportBatch] = useState<{ batchId: string; importedAt: number; itineraryItemIds: string[]; budgetItemIds: string[] } | null>(null);
  const migratedUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!accessToken || storageScope === "guest" || migratedUserRef.current === storageScope) return;
    try { migrateGuestTripLibrary(storageScope); migratedUserRef.current = storageScope; }
    catch { queueMicrotask(() => setActivationError("旅行迁移失败，游客数据已保留。请稍后重试。")); }
  }, [accessToken, storageScope]);
  useEffect(() => {
    if (!accessToken || !activeRealTripId) { queueMicrotask(() => { setCanEditTrip(true); setCanManageMembers(true); setCanDeleteTrip(true); setCapabilityTripId(null); setPermissionStatus("ready"); }); return; }
    queueMicrotask(() => { setCanEditTrip(false); setCanManageMembers(false); setCanDeleteTrip(false); setCapabilityTripId(null); setPermissionStatus("loading"); });
    void listTripMembers(activeRealTripId, accessToken).then((membership) => { setCanEditTrip(membership.canEdit); setCanManageMembers(membership.canManage); setCanDeleteTrip(membership.canDelete); setCapabilityTripId(activeRealTripId); setPermissionStatus("ready"); }).catch(() => { setCanEditTrip(false); setCanManageMembers(false); setCanDeleteTrip(false); setCapabilityTripId(null); setPermissionStatus("error"); });
  }, [accessToken, activeRealTripId]);
  const ensureRealTrip = useCallback(() => {
    if (!safeCanEditTrip) return false;
    // Guest mode keeps its pre-existing local-default persistence behavior.
    // Only a ready authenticated session needs first-trip activation.
    if (!isAuthenticated) return true;
    if (activeRealTripId) return true;
    const id = createId("trip");
    const item: TripLibraryItem = { id, title: tripDetails.title, startDate: tripDetails.startDate, endDate: tripDetails.endDate, status: tripDetails.status };
    try {
      // Write the entry last: a storage failure never leaves a selectable half-trip.
      saveTrip({ expenses, budgetItems, plans }, id, storageScope);
      saveTripDetails(tripDetails, id, storageScope);
      saveTripLibrary([...loadTripLibrary(storageScope), item], storageScope);
    } catch {
      setActivationError("无法创建旅行，请检查浏览器存储后重试。当前输入已保留。");
      return false;
    }
    setActivationError(null);
    setActivatedTripId(id);
    setHasPersistedTrip(true);
    const url = new URL(window.location.href);
    url.searchParams.set("trip", id);
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new CustomEvent("tuyu-tripcreated", { detail: item }));
    return true;
  }, [activeRealTripId, budgetItems, expenses, isAuthenticated, plans, safeCanEditTrip, storageScope, tripDetails]);
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
  const { conflict, resolvingConflict, retryLocalSnapshot, retrySync, syncError, syncRetrying, useRemoteSnapshot } = useTripPersistence({
    accessToken,
    authReady,
    budgetItems,
    details: tripDetails,
    enabled: loadPersistedState && (!isAuthenticated || Boolean(activeRealTripId)) && hydratedStorageScope === storageScope,
    onRemoteTripLoaded: markRemoteTripLoaded,
    persistLocal: !isAuthenticated || hasPersistedTrip || Boolean(activeRealTripId),
    expenses,
    plans,
    setBudgetItems,
    setDetails: setTripDetails,
    setExpenses,
    setPlans,
    storageScope,
    tripId: activeRealTripId || tripId,
  });
  const {
    addExpenseItems,
    addImportBatch,
    addItineraryItems,
    isExpenseAdded,
    isPlanAdded,
  } = useTripImports({
    budgetItems,
    expenses,
    onImported: (itineraryItemIds, budgetItemIds) => setLastImportBatch({ batchId: crypto.randomUUID(), importedAt: Date.now(), itineraryItemIds, budgetItemIds }),
    plans,
    setBudgetItems,
    setExpenses,
    setPlans,
  });
  const undoLastImport = () => { if (!safeCanEditTrip || !lastImportBatch) return; setPlans((current) => current.filter((item) => !lastImportBatch.itineraryItemIds.includes(item.id))); setBudgetItems((current) => current.filter((item) => !lastImportBatch.budgetItemIds.includes(item.id))); setLastImportBatch(null); };
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
  const { archiveTrip, copyInviteLink } = useTripLifecycle({
    accessToken,
    onClosePopover: () => setTripPopover(null),
    onStatusChange: updateTripDetails,
    setShareStatus,
    setShared,
    tripId: activeRealTripId || tripId,
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
    if (!ensureRealTrip()) return;
    copyPlan(item);
    setOpenPlanMenuId(null);
  };
  const deleteActivePlan = (id: string) => {
    if (!ensureRealTrip()) return;
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
    canEditTrip: safeCanEditTrip,
    canManageMembers: safeCanManageMembers,
    canDeleteTrip: safeCanDeleteTrip,
    tripId: activeRealTripId || tripId,
    permissionStatus,
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
    onAddPlan: () => { if (ensureRealTrip()) addPlan(); },
    onAmountChange: setLedgerAmount,
    onDateChange: setLedgerDate,
    onArchive: () => { if (ensureRealTrip()) void archiveTrip(); },
    onCoverChange: (event) => { if (ensureRealTrip()) chooseCoverImage(event); },
    onCopy: copyActivePlan,
    onDelete: deleteActivePlan,
    onDetailsChange: (updates) => { if (ensureRealTrip()) updateTripDetails(updates); },
    onEdit: editActivePlan,
    onEditBudget: (id) => editExpense(id, "estimated"),
    onEditExpense: (id) => editExpense(id, "actual"),
    onInlineChange: setInlinePlanEdit,
    onInvite: copyInviteLink,
    onManualAdd: openManualPlan,
    onMovePlan: (id, day) => { if (ensureRealTrip()) movePlanToDay(id, day); },
    onNameChange: setLedgerName,
    onNoteChange: setLedgerNote,
    onNewPlanChange: setNewPlan,
    onOccurrenceChange: setLedgerOccurrence,
    onPayerChange: setLedgerPayer,
    onOptimize: optimizeActiveDay,
    onRelatedItineraryChange: setLedgerRelatedItineraryItemId,
    onRemoveBudget: (id) => { if (ensureRealTrip()) removeBudgetItem(id); },
    onRemoveExpense: (id) => { if (ensureRealTrip()) removeExpense(id); },
    onSaveEdit: () => { if (ensureRealTrip()) savePlan(); },
    onSaveExpense: () => { if (ensureRealTrip()) addExpense(); },
    onSaveInline: () => { if (ensureRealTrip()) saveInlinePlan(); },
    onSaveManual: () => { if (ensureRealTrip()) saveManualPlan(); },
    onSelectDay: setActiveDay,
    onSelectTab: setWorkspaceTab,
    onTitleChange: setInlineTripTitle,
    onTitleSave: () => { if (ensureRealTrip()) saveInlineTitle(); },
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
    addExpenseItems: (items: ExpenseItem[], destination: "budget" | "ledger") => { if (ensureRealTrip()) addExpenseItems(items, destination); },
    addImportBatch: (itineraryItems: ItineraryItem[], budgetItems: ExpenseItem[]) => { if (ensureRealTrip()) addImportBatch(itineraryItems, budgetItems); },
    addItineraryItems: (items: ItineraryItem[]) => { if (ensureRealTrip()) addItineraryItems(items); },
    isExpenseAdded,
    isPlanAdded,
    lastImportBatch,
    undoLastImport,
    selectedImports,
    toggleImport,
    toggleImports,
  };

  return {
    syncError: activationError ? { message: activationError, retry: null, retrying: false } : syncError ? { message: syncError, retry: retrySync, retrying: syncRetrying } : null,
    syncConflict: conflict ? { resolving: resolvingConflict, retryLocalSnapshot, useRemoteSnapshot } : null,
    workspaceProps,
    importContext,
    importUndo: lastImportBatch ? { batch: lastImportBatch, undo: undoLastImport } : null,
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
