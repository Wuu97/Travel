"use client";

import {
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useScrollRestoration } from "../../navigation/hooks/useScrollRestoration";
import { AiAssistantSection } from "../../chat/components/AiAssistantSection";
import { createTripImportRenderer } from "../../chat/components/TripImportRenderer";
import { useTravelChat } from "../../chat/hooks/useTravelChat";
import { TravelDiscoverySections } from "../../landing/components/TravelDiscoverySections";
import { SiteFooter } from "../../landing/components/SiteFooter";
import { useTravelSearch } from "../../search/hooks/useTravelSearch";
import { defaultTripDetails, getDefaultStoredTrip } from "../../trip/data";
import { clearTripStorage } from "../../trip/storage";
import { TripWorkspace } from "../../trip/components/TripWorkspace";
import { useSaveStatus } from "../../trip/hooks/useSaveStatus";
import { useTripPersistence } from "../../trip/hooks/useTripPersistence";
import { useTripWorkspaceView } from "../../trip/hooks/useTripWorkspaceView";
import { usePlanScroll } from "../../trip/hooks/usePlanScroll";
import { useWorkspaceOverlays } from "../../trip/hooks/useWorkspaceOverlays";
import { useTripImports } from "../../trip/hooks/useTripImports";
import { useTripPlanActions } from "../../trip/hooks/useTripPlanActions";
import { useExpenseEntry } from "../../trip/hooks/useExpenseEntry";
import { useTripDetailsActions } from "../../trip/hooks/useTripDetailsActions";
import { useTripLifecycle } from "../../trip/hooks/useTripLifecycle";
import { useInlinePlanEditor } from "../../trip/hooks/useInlinePlanEditor";
import { useTripBootstrap } from "../../trip/hooks/useTripBootstrap";
import { useAnchorNavigation } from "../../navigation/hooks/useAnchorNavigation";
import { useTripImportSelection } from "../../trip/hooks/useTripImportSelection";
import { useTripSummary } from "../../trip/hooks/useTripSummary";
import type {
  ExpenseItem,
  ItineraryItem,
  LedgerItem,
} from "../../trip/model";

const subscribeToHydration = () => () => {};
const getClientHydrationState = () => true;
const getServerHydrationState = () => false;

function TravelAppContent({ loadPersistedState }: { loadPersistedState: boolean }) {
  const { active, from, notice, search, setActive, setFrom, setNotice, setTo, to } = useTravelSearch();
  const jumpTo = useAnchorNavigation();
  const { initialDetails, initialTrip, tripId } = useTripBootstrap(loadPersistedState);
  const [tripDetails, setTripDetails] = useState(initialDetails);
  const [expenses, setExpenses] = useState<LedgerItem[]>(initialTrip.expenses);
  const [budgetItems, setBudgetItems] = useState<ExpenseItem[]>(
    initialTrip.budgetItems,
  );
  const { announceSave, saveStatus } = useSaveStatus();
  const [plans, setPlans] = useState<ItineraryItem[]>(initialTrip.plans);
  const planMenuRef = useRef<HTMLDivElement>(null);
  const timelineListRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const inlineEditorRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const tripPopoverRef = useRef<HTMLDivElement>(null);
  const memberRoleRef = useRef<HTMLDivElement>(null);

  const { days: tripDays } = useTripSummary(tripDetails, expenses);
  useScrollRestoration();
  const workspaceView = useTripWorkspaceView();
  const {
    activeDay, editingMemberRole, editingPlan,
    inlinePlanEdit, inlineTripTitle, manualPlan, newMember, newPlan,
    openPlanMenuId, pendingPlanScrollId, setActiveDay,
    setEditingMemberRole, setEditingPlan,
    setInlinePlanEdit, setInlineTripTitle, setManualPlan, setNewMember,
    setNewPlan, setOpenPlanMenuId, setPendingPlanScrollId,
    setShareStatus, setShared, setTripPopover, setWorkspaceTab,
    shareStatus, shared, tripPopover, workspaceTab,
  } = workspaceView;
  const { amount: ledgerAmount, editing: ledgerEditing, name: ledgerName, occurrence: ledgerOccurrence, relatedItineraryItemId: ledgerRelatedItineraryItemId, type: ledgerType, visible: ledgerVisible, setAmount: setLedgerAmount, setEditing: setLedgerEditing, setName: setLedgerName, setOccurrence: setLedgerOccurrence, setRelatedItineraryItemId: setLedgerRelatedItineraryItemId, setType: setLedgerType, setVisible: setLedgerVisible } = workspaceView.ledger;
  const { selectedImports, toggleImport } = useTripImportSelection();
  const chat = useTravelChat({ enabled: loadPersistedState });
  const {
    activeChatId,
    aiBusy,
    ask,
    chatMessages,
    chatScrollRef,
    deleteChat,
    exportChat,
    historyOpen,
    historyPanelRef,
    newChat,
    openChat,
    question,
    savedChats,
    setHistoryOpen,
    setQuestion,
  } = chat;
  const { disableRemoteSync } = useTripPersistence({
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
  const { addExpenseItems, addItineraryItems, isExpenseAdded, isPlanAdded } = useTripImports({
    budgetItems,
    expenses,
    plans,
    setBudgetItems,
    setExpenses,
    setPlans,
  });
  const { addPlan, copyPlan, deletePlan, openManualPlan, saveManualPlan, savePlan } = useTripPlanActions({
    activeDay,
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
  const { addExpense, editExpense, removeBudgetItem, removeExpense } = useExpenseEntry({
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
  const { chooseCoverImage, saveInlineTitle: saveInlineTripTitle, updateTripDetails } = useTripDetailsActions({
    activeDay,
    announceSave,
    inlineTitle: inlineTripTitle,
    setActiveDay,
    setDetails: setTripDetails,
    setInlineTitle: setInlineTripTitle,
  });
  const { archiveTrip, copyInviteLink, deleteTrip } = useTripLifecycle({
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
    historyOpen,
    historyPanelRef,
    inlineEditorRef,
    inlinePlanEdit,
    inlineTripTitle,
    memberRoleRef,
    onCloseHistory: () => setHistoryOpen(false),
    onCloseMemberRole: () => setEditingMemberRole(null),
    onClosePlanMenu: () => setOpenPlanMenuId(null),
    onCloseTripPopover: () => setTripPopover(null),
    openPlanMenuId,
    planMenuRef,
    tripPopover,
    tripPopoverRef,
  });
  const renderImportPanel = createTripImportRenderer({
    isExpenseAdded,
    isPlanAdded,
    onAddExpenses: addExpenseItems,
    onAddItineraries: addItineraryItems,
    onToggle: toggleImport,
    selected: selectedImports,
  });

  return (
    <main>
      <TravelDiscoverySections
        active={active}
        from={from}
        notice={notice}
        onNavigate={jumpTo}
        onSearch={search}
        setActive={setActive}
        setFrom={setFrom}
        setNotice={setNotice}
        setTo={setTo}
        to={to}
      />
      <TripWorkspace activeDay={activeDay} budgetItems={budgetItems} coverInputRef={coverInputRef} days={tripDays} details={tripDetails} editingPlan={editingPlan} editingRole={editingMemberRole} expenseAmount={ledgerAmount} expenseName={ledgerName} expenseOccurrence={ledgerOccurrence} expenseType={ledgerType} expenses={expenses} inlineEdit={inlinePlanEdit} inlineEditorRef={inlineEditorRef} inlineTitle={inlineTripTitle} manualPlan={manualPlan} memberRoleRef={memberRoleRef} menuRef={planMenuRef} newMember={newMember} newPlan={newPlan} onAddPlan={addPlan} onAmountChange={setLedgerAmount} onArchive={archiveTrip} onCoverChange={chooseCoverImage} onCopy={(item) => { copyPlan(item); setOpenPlanMenuId(null); }} onDelete={(id) => { deletePlan(id); setOpenPlanMenuId(null); }} onDeleteTrip={() => void deleteTrip()} onDetailsChange={updateTripDetails} onEdit={(item) => { setEditingPlan({ ...item, day: item.day || activeDay }); setOpenPlanMenuId(null); }} onEditBudget={(id) => editExpense(id, "estimated")} onEditExpense={(id) => editExpense(id, "actual")} onInlineChange={setInlinePlanEdit} onInvite={copyInviteLink} onManualAdd={openManualPlan} onNameChange={setLedgerName} onNewPlanChange={setNewPlan} onOccurrenceChange={setLedgerOccurrence} onOptimize={() => { setQuestion(`请优化杭州 DAY ${activeDay} 的路线`); document.querySelector("#ai")?.scrollIntoView({ behavior: "smooth" }); }} onRelatedItineraryChange={setLedgerRelatedItineraryItemId} onRemoveBudget={removeBudgetItem} onRemoveExpense={removeExpense} onSaveEdit={savePlan} onSaveExpense={addExpense} onSaveInline={saveInlinePlan} onSaveManual={saveManualPlan} onSelectDay={setActiveDay} onSelectTab={setWorkspaceTab} onTitleChange={setInlineTripTitle} onTitleSave={saveInlineTripTitle} onToggleExpense={() => setLedgerVisible(!ledgerVisible)} onToggleMenu={(id) => setOpenPlanMenuId((current) => current === id ? null : id)} onTypeChange={setLedgerType} openMenuId={openPlanMenuId} plans={plans} popover={tripPopover} relatedItineraryItemId={ledgerRelatedItineraryItemId} saveStatus={saveStatus} setEditingPlan={setEditingPlan} setEditingRole={setEditingMemberRole} setManualPlan={setManualPlan} setNewMember={setNewMember} setPopover={setTripPopover} shared={shared} shareStatus={shareStatus} showExpense={ledgerVisible} timelineRef={timelineListRef} tripPopoverRef={tripPopoverRef} workspaceTab={workspaceTab} />

      <AiAssistantSection
        activeChatId={activeChatId}
        busy={aiBusy}
        historyOpen={historyOpen}
        historyPanelRef={historyPanelRef}
        messages={chatMessages}
        onAsk={ask}
        onDelete={deleteChat}
        onExport={exportChat}
        onNewChat={newChat}
        onOpen={openChat}
        onQuestionChange={setQuestion}
        onToggleHistory={() => setHistoryOpen((current) => !current)}
        question={question}
        renderImports={renderImportPanel}
        savedChats={savedChats}
        scrollRef={chatScrollRef}
      />
      <SiteFooter />
    </main>
  );
}

export function TravelApp() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationState,
    getServerHydrationState,
  );
  return (
    <TravelAppContent
      key={hydrated ? "hydrated" : "server"}
      loadPersistedState={hydrated}
    />
  );
}
