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
import { useTripWorkspaceController } from "../../trip/hooks/useTripWorkspaceController";

export function TravelAppContent({ loadPersistedState }: { loadPersistedState: boolean }) {
  const auth = useSupabaseAuth();
  const { active, from, notice, search, setActive, setFrom, setNotice, setTo, to } = useTravelSearch();
  const jumpTo = useAnchorNavigation();
  const chat = useTravelChat({ accessToken: auth.accessToken, authReady: auth.ready, enabled: loadPersistedState });
  useChatHistoryOverlay(chat.historyOpen, chat.historyPanelRef, chat.setHistoryOpen);
  const workspace = useTripWorkspaceController({
    accessToken: auth.accessToken,
    authReady: auth.ready,
    chatMessages: chat.chatMessages,
    loadPersistedState,
    newChat: chat.newChat,
    setQuestion: chat.setQuestion,
  });
  const renderImportPanel = createTripImportRenderer({
    isExpenseAdded: workspace.importContext.isExpenseAdded,
    isPlanAdded: workspace.importContext.isPlanAdded,
    onAddExpenses: workspace.importContext.addExpenseItems,
    onAddItineraries: workspace.importContext.addItineraryItems,
    onToggle: workspace.importContext.toggleImport,
    selected: workspace.importContext.selectedImports,
  });
  useScrollRestoration();

  return (
    <main>
      <TravelDiscoverySections
        accountLabel={auth.user?.email || auth.user?.phone || null}
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
      <AiAssistantSection
        activeChatId={chat.activeChatId}
        busy={chat.aiBusy}
        historyOpen={chat.historyOpen}
        historyPanelRef={chat.historyPanelRef}
        messages={chat.chatMessages}
        onAsk={chat.ask}
        onDelete={chat.deleteChat}
        onNewChat={chat.newChat}
        onOpen={chat.openChat}
        onQuestionChange={chat.setQuestion}
        onToggleHistory={() => chat.setHistoryOpen((current) => !current)}
        question={chat.question}
        renderImports={renderImportPanel}
        savedChats={chat.savedChats}
        scrollRef={chat.chatScrollRef}
      />
      {workspace.syncError && <p className="sync-error" role="status">{workspace.syncError}</p>}
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
