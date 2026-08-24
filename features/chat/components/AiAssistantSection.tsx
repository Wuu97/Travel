import { useState, type RefObject, type ReactNode } from "react";
import type { ChatMessage, SavedChat } from "../model";
import { AiAssistantIntro } from "./AiAssistantIntro";
import { ChatComposer } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
import { ChatHistory } from "./ChatHistory";
import { ChatMessageList } from "./ChatMessageList";
import { ChatPdfExport } from "./ChatPdfExport";

type Props = { activeChatId: string; busy: boolean; historyOpen: boolean; historyPanelRef: RefObject<HTMLDivElement | null>; messages: ChatMessage[]; onAsk: () => void; onDelete: (id: string) => void; onNewChat: () => void; onOpen: (chat: SavedChat) => void; onQuestionChange: (value: string) => void; onToggleHistory: () => void; question: string; renderImports: (message: ChatMessage) => ReactNode; savedChats: SavedChat[]; scrollRef: RefObject<HTMLDivElement | null> };

export function AiAssistantSection({ activeChatId, busy, historyPanelRef, messages, onAsk, onDelete, onNewChat, onOpen, onQuestionChange, question, renderImports, savedChats, scrollRef }: Props) {
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [historyCollapsed, setHistoryCollapsed] = useState(false);
  const title = savedChats.find((chat) => chat.id === activeChatId)?.title || "途遇 AI 对话";
  return <section className="ai-wrap" id="ai"><div className="wide-ai"><AiAssistantIntro /><div className={`chat-workbench${historyCollapsed ? " is-history-collapsed" : ""}`}><aside className={`ai-history-sidebar${historyCollapsed ? " is-collapsed" : ""}`} ref={historyPanelRef}><ChatHistory activeChatId={activeChatId} collapsed={historyCollapsed} onDelete={onDelete} onNewChat={onNewChat} onOpen={onOpen} onToggleCollapse={() => setHistoryCollapsed((current) => !current)} savedChats={savedChats} /></aside><div className="chat"><ChatHeader hasMessages={Boolean(messages.length)} onExport={() => setPdfPreviewOpen(true)} provider="DeepSeek" /><div className="chat-scroll" ref={scrollRef}><ChatMessageList busy={busy} messages={messages} renderImports={renderImports} /></div><ChatComposer busy={busy} onAsk={onAsk} onQuestionChange={onQuestionChange} question={question} /></div></div><ChatPdfExport messages={messages} onClose={() => setPdfPreviewOpen(false)} open={pdfPreviewOpen} title={title} /></div></section>;
}
