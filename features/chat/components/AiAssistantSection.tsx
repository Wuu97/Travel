import type { RefObject, ReactNode } from "react";
import type { ChatMessage, SavedChat } from "../model";
import { AiAssistantIntro } from "./AiAssistantIntro";
import { ChatComposer } from "./ChatComposer";
import { ChatHeader } from "./ChatHeader";
import { ChatHistory } from "./ChatHistory";
import { ChatMessageList } from "./ChatMessageList";

type Props = { activeChatId: string; busy: boolean; historyOpen: boolean; historyPanelRef: RefObject<HTMLDivElement | null>; messages: ChatMessage[]; onAsk: () => void; onDelete: (id: string) => void; onExport: () => void; onNewChat: () => void; onOpen: (chat: SavedChat) => void; onQuestionChange: (value: string) => void; onToggleHistory: () => void; question: string; renderImports: (message: ChatMessage) => ReactNode; savedChats: SavedChat[]; scrollRef: RefObject<HTMLDivElement | null> };

export function AiAssistantSection({ activeChatId, busy, historyOpen, historyPanelRef, messages, onAsk, onDelete, onExport, onNewChat, onOpen, onQuestionChange, onToggleHistory, question, renderImports, savedChats, scrollRef }: Props) {
  return <section className="ai-wrap" id="ai"><div className="wide-ai"><AiAssistantIntro setQuestion={onQuestionChange} /><div className={`chat ${historyOpen ? "history-visible" : ""}`}><ChatHeader history={<ChatHistory activeChatId={activeChatId} hasMessages={Boolean(messages.length)} onDelete={onDelete} onExport={onExport} onOpen={onOpen} savedChats={savedChats} />} historyOpen={historyOpen} historyPanelRef={historyPanelRef} onNewChat={onNewChat} onToggleHistory={onToggleHistory} provider="DeepSeek" /><div className="chat-scroll" ref={scrollRef}><ChatMessageList busy={busy} messages={messages} renderImports={renderImports} /></div><ChatComposer busy={busy} onAsk={onAsk} onQuestionChange={onQuestionChange} question={question} /></div></div></section>;
}
