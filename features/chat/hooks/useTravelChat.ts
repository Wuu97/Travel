import { useEffect, useRef, useState } from "react";
import { downloadChatTranscript } from "../export";
import { useChatScroll } from "./useChatScroll";
import { normalizeAssistantResponse, type ChatMessage, type SavedChat } from "../model";
import { loadSavedChats, saveChats } from "../storage";

type Options = { enabled: boolean };

/** Owns chat history, AI requests, and export without leaking persistence details to UI. */
export function useTravelChat({ enabled }: Options) {
  const [initialChats] = useState(() => (enabled ? loadSavedChats() : []));
  const [question, setQuestion] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => initialChats[0]?.messages ?? []);
  const [savedChats, setSavedChats] = useState<SavedChat[]>(initialChats);
  const [activeChatId, setActiveChatId] = useState(() => initialChats[0]?.id ?? "current");
  const [historyOpen, setHistoryOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const historyPanelRef = useRef<HTMLDivElement>(null);

  useChatScroll(chatScrollRef, chatMessages, aiBusy);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !chatMessages.length) return;
    const latest = chatMessages.at(-1)!;
    console.debug("[chat] rendered message fields", latest);
  }, [chatMessages]);

  const saveChat = (messages: ChatMessage[]) => {
    const title = messages.find((message) => message.role === "user")?.content.slice(0, 18) || "新对话";
    setSavedChats((current) => {
      const previous = current.find((chat) => chat.id === activeChatId);
      const chat: SavedChat = { id: activeChatId, title, createdAt: previous?.createdAt ?? Date.now(), updatedAt: Date.now(), messages };
      const next = [chat, ...current.filter((item) => item.id !== activeChatId)]
        .sort((first, second) => second.updatedAt - first.updatedAt)
        .slice(0, 20);
      saveChats(next);
      return next;
    });
  };

  const ask = async () => {
    if (!question.trim() || aiBusy) return;
    const userMessage = question.trim();
    const history = chatMessages;
    const messagesWithQuestion = [...history, { role: "user" as const, content: userMessage }];
    setQuestion("");
    setChatMessages(messagesWithQuestion);
    setAiBusy(true);
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMessage, history }) });
      const data = await response.json();
      const messages = [...messagesWithQuestion, normalizeAssistantResponse(data.reply ?? data, data.error || "暂时无法生成回复。")];
      setChatMessages(messages);
      saveChat(messages);
    } catch {
      const messages = [...messagesWithQuestion, { role: "assistant" as const, content: "无法连接 AI 服务，请检查本地预览是否正在运行。" }];
      setChatMessages(messages);
      saveChat(messages);
    } finally {
      setAiBusy(false);
    }
  };

  const newChat = () => {
    setActiveChatId(`chat-${Date.now()}`);
    setChatMessages([]);
    setQuestion("");
    setHistoryOpen(false);
  };
  const openChat = (chat: SavedChat) => {
    setActiveChatId(chat.id);
    setChatMessages(chat.messages);
    setHistoryOpen(false);
  };
  const deleteChat = (chatId: string) => {
    if (!window.confirm("确定删除这段本地对话吗？此操作无法撤销。")) return;
    setSavedChats((current) => {
      const next = current.filter((chat) => chat.id !== chatId);
      saveChats(next);
      return next;
    });
    if (chatId === activeChatId) newChat();
  };
  const exportChat = () => {
    if (!chatMessages.length) return;
    const title = savedChats.find((chat) => chat.id === activeChatId)?.title || "途遇 AI 对话";
    downloadChatTranscript(title, chatMessages);
  };

  return { activeChatId, aiBusy, ask, chatMessages, chatScrollRef, deleteChat, exportChat, historyOpen, historyPanelRef, newChat, openChat, question, savedChats, setHistoryOpen, setQuestion };
}
