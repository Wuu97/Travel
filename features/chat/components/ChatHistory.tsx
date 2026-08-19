import type { SavedChat } from "../model";

type Props = {
  activeChatId: string;
  hasMessages: boolean;
  savedChats: SavedChat[];
  onDelete: (chatId: string) => void;
  onExport: () => void;
  onOpen: (chat: SavedChat) => void;
};

export function ChatHistory({ activeChatId, hasMessages, savedChats, onDelete, onExport, onOpen }: Props) {
  return (
    <div className="chat-history">
      <div className="history-tools">
        <b>历史对话</b>
        <button onClick={onExport} disabled={!hasMessages}>⇩ 导出当前</button>
      </div>
      <div className="history-list">
        {savedChats.length ? savedChats.map((chat) => (
          <div className={`history-row ${chat.id === activeChatId ? "current" : ""}`} key={chat.id}>
            <button className="history-open" onClick={() => onOpen(chat)}>
              <b>{chat.title}</b>
              <small>{new Date(chat.createdAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</small>
            </button>
            <button className="history-delete" onClick={() => onDelete(chat.id)} title="删除这段对话">×</button>
          </div>
        )) : <p>还没有历史对话</p>}
      </div>
    </div>
  );
}
