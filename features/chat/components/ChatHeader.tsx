import type { RefObject } from "react";
import type { ReactNode } from "react";

type Props = {
  history: ReactNode;
  historyOpen: boolean;
  historyPanelRef: RefObject<HTMLDivElement | null>;
  onNewChat: () => void;
  onToggleHistory: () => void;
  provider: string;
};

export function ChatHeader({ history, historyOpen, historyPanelRef, onNewChat, onToggleHistory, provider }: Props) {
  return (
    <div className="chat-top">
      <span className="ai-dot">✦</span>
      <div><b>途遇 AI</b><small>由 {provider} 驱动</small></div>
      <i>在线</i>
      <div className="history-control" ref={historyPanelRef}>
        <button className="history-button" onClick={onToggleHistory}>◷ 对话</button>
        {historyOpen && history}
      </div>
      <button className="new-chat" onClick={onNewChat}>＋ 新建</button>
    </div>
  );
}
