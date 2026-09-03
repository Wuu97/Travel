import type { SavedChat } from "../model";
import { SidebarCollapseButton } from "../../shared/components/SidebarCollapseButton";
import { SidebarHeader } from "../../shared/components/SidebarHeader";
import { SidebarHeaderAction } from "../../shared/components/SidebarHeaderAction";
import { ScrollArea } from "../../shared/components/ScrollArea";
import { IconButton } from "../../shared/components/IconButton";

type Props = {
  activeChatId: string;
  savedChats: SavedChat[];
  onDelete: (chatId: string) => void;
  onNewChat: () => void;
  onOpen: (chat: SavedChat) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export function ChatHistory({ activeChatId, collapsed, onDelete, onNewChat, onOpen, onToggleCollapse, savedChats }: Props) {
  return (
    <div className="chat-history">
      <SidebarHeader action={<SidebarHeaderAction aria-label="新建对话" title="新建对话" onClick={onNewChat}>＋ 新建</SidebarHeaderAction>} className="history-tools" collapseButton={<SidebarCollapseButton className="sidebar-header-collapse" collapseLabel="收起历史对话侧栏" collapsed={collapsed} expandLabel="展开历史对话侧栏" onToggle={onToggleCollapse} />} title="历史对话" />
      <ScrollArea className="history-list">
        {savedChats.length ? savedChats.map((chat) => (
          <div className={`history-row ${chat.id === activeChatId ? "current" : ""}`} key={chat.id}>
            <button className="history-open" onClick={() => onOpen(chat)}>
              <b>{chat.title}</b>
              <small>{new Date(chat.createdAt).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</small>
            </button>
            <IconButton aria-label="删除这段对话" icon="trash" title="删除这段对话" variant="danger" onClick={() => onDelete(chat.id)} />
          </div>
        )) : <p>还没有历史对话</p>}
      </ScrollArea>
    </div>
  );
}
