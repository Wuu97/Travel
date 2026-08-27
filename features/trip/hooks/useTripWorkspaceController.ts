import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TripWorkspaceProps } from "../components/TripWorkspace";
import { defaultTripDetails, getDefaultStoredTrip } from "../data";
import type { ExpenseItem, ItineraryItem, LedgerItem, TripLibraryItem } from "../model";
import { hasStoredTripSnapshot, loadStoredTrip, loadTripDetails, loadTripLibrary, mergeTripLibraryItems, migrateGuestTripLibrary, saveTrip, saveTripDetails, saveTripLibrary, sortTripLibraryItems } from "../storage";
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
import { listAccessibleTrips, listTripMembers } from "../api";
import { selectTripFromLibrary } from "../librarySelection";
import { useTripPlanActions } from "./useTripPlanActions";
import { useTripSummary } from "./useTripSummary";
import { useTripWorkspaceView } from "./useTripWorkspaceView";
import { useWorkspaceOverlays } from "./useWorkspaceOverlays";
import { writeHistoryIfChanged } from "../../navigation/history";

type ChatMessage = { role: "user" | "assistant"; content: string };
type LibraryCommit = { scope: string; items: TripLibraryItem[]; cloudDeleteCapabilities: Map<string, boolean>; error: string | null };
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
  const { initialDetails, initialTrip, tripId: bootstrapTripId } = useTripBootstrap();
  const isAuthenticated = authReady && Boolean(accessToken);
  // TravelApp deliberately renders one server-equivalent pass before it reads
  // browser persistence. Keep URL selection behind that same gate so a
  // bookmarked trip cannot turn the first client render into a different
  // workspace from the server HTML.
  const hasTripInUrl = loadPersistedState && typeof window !== "undefined" && Boolean(new URLSearchParams(window.location.search).get("trip"));
  const requiresMembershipResolution = Boolean(accessToken && hasTripInUrl && bootstrapTripId !== DEFAULT_TRIP_ID);
  // undefined means the library has not restored yet; null means it restored
  // an empty library. This prevents a stale URL from reclaiming active state.
  const [activatedTripId, setActivatedTripId] = useState<string | null | undefined>(undefined);
  const [libraryCommit, setLibraryCommit] = useState<LibraryCommit | null>(null);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [canEditTrip, setCanEditTrip] = useState(() => !requiresMembershipResolution);
  const [canManageMembers, setCanManageMembers] = useState(() => !requiresMembershipResolution);
  const [canDeleteTrip, setCanDeleteTrip] = useState(() => !requiresMembershipResolution);
  const [capabilityTripId, setCapabilityTripId] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<"loading" | "ready" | "error">("ready");
  // Controller state is the workspace source of truth after hydration. The
  // URL supplies only the initial deep-link input and user navigation output.
  const activeRealTripId = activatedTripId !== undefined
    ? activatedTripId
    : hasTripInUrl && bootstrapTripId !== DEFAULT_TRIP_ID ? bootstrapTripId : null;
  const activeTripId = activeRealTripId || bootstrapTripId;
  const onActiveTripChange = useCallback((tripId: string | null) => setActivatedTripId(tripId), []);
  const membershipPending = Boolean(accessToken && activeRealTripId) && capabilityTripId !== activeRealTripId;
  // A trip switch changes activeRealTripId during render, before the
  // membership effect can set its state to loading. Derive that transition
  // synchronously so a stale "ready" value cannot be rendered as readonly.
  const effectivePermissionStatus = permissionStatus === "error"
    ? "error"
    : membershipPending ? "loading" : permissionStatus;
  const safeCanEditTrip = membershipPending ? false : canEditTrip;
  const safeCanManageMembers = membershipPending ? false : canManageMembers;
  const safeCanDeleteTrip = membershipPending ? false : canDeleteTrip;
  // A scope is hydrated only after its persisted snapshot has been read. In
  // particular, "guest" must not count as ready while Supabase restores a
  // signed-in session and may switch the scope to that user.
  const [hydratedStorageScope, setHydratedStorageScope] = useState<string | null>(null);
  const libraryReady = libraryCommit?.scope === storageScope;
  const persistenceReady = loadPersistedState && authReady && libraryReady && hydratedStorageScope === storageScope;
  // The default workspace is only a presentation fallback. It must never become
  // a persisted guest trip simply because the library is empty.
  const hasPersistedTripInScope = useCallback(() => hasStoredTripSnapshot(activeTripId, storageScope) || loadTripLibrary(storageScope).some((trip) => trip.id === activeTripId), [activeTripId, storageScope]);
  // Reading local storage here would make the server and first browser render
  // disagree. The persistence effect below resolves this after mounting.
  const [hasPersistedTrip, setHasPersistedTrip] = useState(false);
  const markRemoteTripLoaded = useCallback(() => setHasPersistedTrip(true), []);
  const [tripDetails, setTripDetails] = useState(initialDetails);
  const [expenses, setExpenses] = useState<LedgerItem[]>(initialTrip.expenses);
  const [budgetItems, setBudgetItems] = useState<ExpenseItem[]>(initialTrip.budgetItems);
  const [plans, setPlans] = useState<ItineraryItem[]>(initialTrip.plans);
  const [lastImportBatch, setLastImportBatch] = useState<{ batchId: string; importedAt: number; itineraryItemIds: string[]; budgetItemIds: string[] } | null>(null);
  const [undoImportSuccess, setUndoImportSuccess] = useState(false);
  const migratedUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!loadPersistedState || !authReady) return;
    let cancelled = false;
    void (async () => {
      // This is the only initial library commit. The sidebar and workspace
      // intentionally share it instead of independently restoring local and
      // cloud sources.
      const storedLibrary = loadTripLibrary(storageScope);
      // Older scopes can contain a saved default snapshot but no library
      // index. Treat that snapshot as one library item so the sidebar and
      // workspace never disagree about whether a trip exists.
      const localItems = storedLibrary.length || !hasStoredTripSnapshot(bootstrapTripId, storageScope)
        ? storedLibrary
        : [{ id: bootstrapTripId, title: initialDetails.title, startDate: initialDetails.startDate, endDate: initialDetails.endDate, status: initialDetails.status }];
      let finalItems = localItems;
      let cloudDeleteCapabilities = new Map<string, boolean>();
      let error: string | null = null;
      if (accessToken) {
        try {
          const cloudItems = await listAccessibleTrips(accessToken);
          if (cancelled) return;
          cloudDeleteCapabilities = new Map(cloudItems.map((item) => [item.id, item.canDelete === true]));
          finalItems = mergeTripLibraryItems(localItems, cloudItems);
          if (cloudItems.length) saveTripLibrary(finalItems, storageScope);
        } catch {
          error = "云端旅行暂时无法加载，当前显示本地数据。";
        }
      }
      if (cancelled) return;
      finalItems = sortTripLibraryItems(finalItems);
      const requestedTripId = new URLSearchParams(window.location.search).get("trip");
      const localSelection = selectTripFromLibrary(localItems, requestedTripId).selectedTripId;
      const selectedTripId = localSelection && finalItems.some((item) => item.id === localSelection)
        ? localSelection
        : selectTripFromLibrary(finalItems, requestedTripId).selectedTripId;
      setLibraryCommit({ scope: storageScope, items: finalItems, cloudDeleteCapabilities, error });
      setActivatedTripId(selectedTripId);
    })();
    return () => { cancelled = true; };
  }, [accessToken, authReady, bootstrapTripId, initialDetails.endDate, initialDetails.startDate, initialDetails.status, initialDetails.title, loadPersistedState, storageScope]);
  useEffect(() => {
    if (!accessToken || storageScope === "guest" || migratedUserRef.current === storageScope) return;
    const result = migrateGuestTripLibrary(storageScope);
    if (result.status === "success" || result.status === "noop") { migratedUserRef.current = storageScope; return; }
    queueMicrotask(() => setActivationError("旅行迁移失败，游客数据已保留。请稍后重试。"));
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
    writeHistoryIfChanged("replace", url, "create-first-trip");
    window.dispatchEvent(new CustomEvent("tuyu-tripcreated", { detail: item }));
    return true;
  }, [activeRealTripId, budgetItems, expenses, isAuthenticated, plans, safeCanEditTrip, storageScope, tripDetails]);
  useEffect(() => {
    if (!loadPersistedState || !authReady) return;
    // TripLibrary owns the unified local/cloud collection commit. Do not load
    // the neutral fallback while that commit has not selected a real trip.
    if (activatedTripId === undefined) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const trip = loadStoredTrip(getDefaultStoredTrip(), activeTripId, storageScope);
      setExpenses(trip.expenses);
      setBudgetItems(trip.budgetItems);
      setPlans(trip.plans);
      setTripDetails(loadTripDetails(defaultTripDetails, activeTripId, storageScope));
      setHasPersistedTrip(hasPersistedTripInScope());
      setHydratedStorageScope(storageScope);
    });
    return () => { cancelled = true; };
  }, [activatedTripId, activeTripId, authReady, hasPersistedTripInScope, loadPersistedState, storageScope]);
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
    enabled: loadPersistedState && (!isAuthenticated || Boolean(activeRealTripId)) && persistenceReady,
    onRemoteTripLoaded: markRemoteTripLoaded,
    persistLocal: !isAuthenticated || hasPersistedTrip || Boolean(activeRealTripId),
    expenses,
    plans,
    setBudgetItems,
    setDetails: setTripDetails,
    setExpenses,
    setPlans,
    storageScope,
    tripId: activeTripId,
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
    onImported: (itineraryItemIds, budgetItemIds) => { setUndoImportSuccess(false); setLastImportBatch({ batchId: crypto.randomUUID(), importedAt: Date.now(), itineraryItemIds, budgetItemIds }); },
    plans,
    setBudgetItems,
    setExpenses,
    setPlans,
  });
  const undoLastImport = () => { if (!safeCanEditTrip || !lastImportBatch) return; setPlans((current) => current.filter((item) => !lastImportBatch.itineraryItemIds.includes(item.id))); setBudgetItems((current) => current.filter((item) => !lastImportBatch.budgetItemIds.includes(item.id))); setLastImportBatch(null); setUndoImportSuccess(true); };
  useEffect(() => { if (!undoImportSuccess) return; const timer = window.setTimeout(() => setUndoImportSuccess(false), 3_000); return () => window.clearTimeout(timer); }, [undoImportSuccess]);
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
      onMetadataSaved: (patch) => {
        if (patch.title === undefined && patch.startDate === undefined && patch.endDate === undefined && patch.status === undefined) return;
        setLibraryCommit((current) => {
          if (!current || current.scope !== storageScope) return current;
          const items = current.items.map((item) => item.id === activeTripId ? {
            ...item,
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...(patch.startDate !== undefined ? { startDate: patch.startDate } : {}),
            ...(patch.endDate !== undefined ? { endDate: patch.endDate } : {}),
            ...(patch.status !== undefined ? { status: patch.status } : {}),
          } : item);
          saveTripLibrary(items, storageScope);
          return { ...current, items };
        });
      },
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
    tripId: activeTripId,
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
  const workspaceEmpty = persistenceReady && !hasPersistedTrip && !activeRealTripId;
  const ensureActiveTrip = () => !workspaceEmpty && ensureRealTrip();
  const copyActivePlan = (item: ItineraryItem) => {
    if (!ensureActiveTrip()) return;
    copyPlan(item);
    setOpenPlanMenuId(null);
  };
  const deleteActivePlan = (id: string) => {
    if (!ensureActiveTrip()) return;
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
    browserReady: loadPersistedState && authReady,
    libraryItems: libraryCommit?.items || [],
    libraryCloudDeleteCapabilities: libraryCommit?.cloudDeleteCapabilities || new Map(),
    libraryError: libraryCommit?.error || null,
    libraryReady,
    persistenceReady,
    onActiveTripChange,
    workspaceEmpty,
    tripId: activeTripId,
    permissionStatus: effectivePermissionStatus,
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
    onAddPlan: () => { if (ensureActiveTrip()) addPlan(); },
    onAmountChange: setLedgerAmount,
    onDateChange: setLedgerDate,
    onArchive: () => { if (ensureActiveTrip()) void archiveTrip(); },
    onCoverChange: (event) => { if (ensureActiveTrip()) chooseCoverImage(event); },
    onCopy: copyActivePlan,
    onDelete: deleteActivePlan,
    onDetailsChange: (updates) => { if (ensureActiveTrip()) updateTripDetails(updates); },
    onEdit: editActivePlan,
    onEditBudget: (id) => editExpense(id, "estimated"),
    onEditExpense: (id) => editExpense(id, "actual"),
    onInlineChange: setInlinePlanEdit,
    onInvite: copyInviteLink,
    onManualAdd: openManualPlan,
    onMovePlan: (id, day) => { if (ensureActiveTrip()) movePlanToDay(id, day); },
    onNameChange: setLedgerName,
    onNoteChange: setLedgerNote,
    onNewPlanChange: setNewPlan,
    onOccurrenceChange: setLedgerOccurrence,
    onPayerChange: setLedgerPayer,
    onOptimize: optimizeActiveDay,
    onRelatedItineraryChange: setLedgerRelatedItineraryItemId,
    onRemoveBudget: (id) => { if (ensureActiveTrip()) removeBudgetItem(id); },
    onRemoveExpense: (id) => { if (ensureActiveTrip()) removeExpense(id); },
    onSaveEdit: () => { if (ensureActiveTrip()) savePlan(); },
    onSaveExpense: () => { if (ensureActiveTrip()) addExpense(); },
    onSaveInline: () => { if (ensureActiveTrip()) saveInlinePlan(); },
    onSaveManual: () => { if (ensureActiveTrip()) saveManualPlan(); },
    onSelectDay: setActiveDay,
    onSelectTab: setWorkspaceTab,
    onTitleChange: setInlineTripTitle,
    onTitleSave: () => { if (ensureActiveTrip()) saveInlineTitle(); },
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
    addExpenseItems: (items: ExpenseItem[], destination: "budget" | "ledger") => { if (ensureActiveTrip()) addExpenseItems(items, destination); },
    addImportBatch: (itineraryItems: ItineraryItem[], budgetItems: ExpenseItem[]) => { if (ensureActiveTrip()) addImportBatch(itineraryItems, budgetItems); },
    addItineraryItems: (items: ItineraryItem[]) => { if (ensureActiveTrip()) addItineraryItems(items); },
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
    undoImportSuccess,
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
