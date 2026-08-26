"use client";

import { useScrollRestoration } from "../../navigation/hooks/useScrollRestoration";
import { AiAssistantSection } from "../../chat/components/AiAssistantSection";
import { useSupabaseAuth } from "../../auth/useSupabaseAuth";
import { AuthControl } from "../../auth/components/AuthControl";
import { createTripImportRenderer } from "../../chat/components/TripImportRenderer";
import { useTravelChat } from "../../chat/hooks/useTravelChat";
import { useChatHistoryOverlay } from "../../chat/hooks/useChatHistoryOverlay";
import { TravelDiscoverySections } from "../../landing/components/TravelDiscoverySections";
import { SiteFooter } from "../../landing/components/SiteFooter";
import { useAnchorNavigation } from "../../navigation/hooks/useAnchorNavigation";
import { useTravelSearch } from "../../search/hooks/useTravelSearch";
import { TripWorkspace } from "../../trip/components/TripWorkspace";
import { TripCapabilitiesContext } from "../../trip/components/TripCapabilities";
import { useTripWorkspaceController } from "../../trip/hooks/useTripWorkspaceController";
import { useEffect } from "react";

export function TravelAppContent({ loadPersistedState }: { loadPersistedState: boolean }) {
  const auth = useSupabaseAuth();
  const storageScope = auth.user?.id || "guest";
  const { active, from, notice, search, setActive, setFrom, setNotice, setTo, to } = useTravelSearch();
  const jumpTo = useAnchorNavigation();
  const chat = useTravelChat({ accessToken: auth.accessToken, authReady: auth.ready, enabled: loadPersistedState, storageScope });
  useChatHistoryOverlay(chat.historyOpen, chat.historyPanelRef, chat.setHistoryOpen);
  const workspace = useTripWorkspaceController({
    accessToken: auth.accessToken,
    authReady: auth.ready,
    chatMessages: chat.chatMessages,
    loadPersistedState,
    newChat: chat.newChat,
    setQuestion: chat.setQuestion,
    storageScope,
  });
  const { setTravelContext } = chat;
  useEffect(() => setTravelContext(workspace.travelContext), [setTravelContext, workspace.travelContext]);
  const renderImportPanel = createTripImportRenderer({
    isExpenseAdded: workspace.importContext.isExpenseAdded,
    isPlanAdded: workspace.importContext.isPlanAdded,
    onAddExpenses: workspace.importContext.addExpenseItems,
    onAddItineraries: workspace.importContext.addItineraryItems,
    onToggle: workspace.importContext.toggleImport,
    onToggleMany: workspace.importContext.toggleImports,
    selected: workspace.importContext.selectedImports,
  });
  useScrollRestoration();

  return (
    <main>
      <TravelDiscoverySections
        accountLabel={auth.user?.email || auth.user?.phone || null}
        accessToken={auth.accessToken}
        active={active}
        from={from}
        notice={notice}
        onNavigate={jumpTo}
        onSearch={search}
        onSignOut={() => void auth.signOut()}
        setActive={setActive}
        setFrom={setFrom}
        setNotice={setNotice}
        setTo={setTo}
        to={to}
      />
      <TripWorkspace {...workspace.workspaceProps} />
      <TripCapabilitiesContext.Provider value={{ canEditTrip: workspace.workspaceProps.canEditTrip, canManageMembers: workspace.workspaceProps.canManageMembers, canDeleteTrip: workspace.workspaceProps.canDeleteTrip }}><AiAssistantSection
        activeChatId={chat.activeChatId}
        aiError={chat.aiError}
        busy={chat.aiBusy}
        historyOpen={chat.historyOpen}
        historyPanelRef={chat.historyPanelRef}
        messages={chat.chatMessages}
        onAsk={chat.ask}
        onDelete={chat.deleteChat}
        onNewChat={chat.newChat}
        onOpen={chat.openChat}
        onQuestionChange={chat.setQuestion}
        onRetryLastQuestion={() => void chat.retryLastQuestion()}
        onToggleHistory={() => chat.setHistoryOpen((current) => !current)}
        question={chat.question}
        renderImports={renderImportPanel}
        savedChats={chat.savedChats}
        scrollRef={chat.chatScrollRef}
      /></TripCapabilitiesContext.Provider>
      {workspace.syncError && <p className="sync-error" role="status">{workspace.syncError.message}{workspace.syncError.retry && <button type="button" disabled={workspace.syncError.retrying} onClick={() => void workspace.syncError?.retry?.()}>{workspace.syncError.retrying ? "正在重试" : "重试同步"}</button>}</p>}
      {workspace.syncConflict && <div className="sync-error" role="alert"><p>旅行已被其他成员更新。</p><button type="button" disabled={workspace.syncConflict.resolving} onClick={workspace.syncConflict.useRemoteSnapshot}>使用最新版本</button><button type="button" disabled={workspace.syncConflict.resolving} onClick={() => void workspace.syncConflict?.retryLocalSnapshot()}>保留我的修改</button></div>}
      {workspace.importUndo && <div className="sync-error" role="status">已导入 {workspace.importUndo.batch.itineraryItemIds.length} 个行程、{workspace.importUndo.batch.budgetItemIds.length} 笔预计费用{workspace.workspaceProps.canEditTrip && <button type="button" onClick={workspace.importUndo.undo}>撤销</button>}</div>}
      <SiteFooter />
      <AuthControl
        configured={auth.configured}
        error={auth.error}
        onClearError={auth.clearError}
        onRequestPhoneOtp={auth.requestPhoneOtp}
        onResendSignupEmail={auth.resendSignupEmail}
        onSignIn={auth.signInWithPassword}
        onSignOut={auth.signOut}
        onSignUp={auth.signUpWithPassword}
        onVerifyPhoneOtp={auth.verifyPhoneOtp}
        ready={auth.ready}
        showTrigger={false}
        user={auth.user}
      />
    </main>
  );
}
