import { useEffect, useRef, useState } from "react";
import { downloadChatTranscript } from "../export";
import { useChatScroll } from "./useChatScroll";
import { normalizeAssistantResponse, type ChatMessage, type SavedChat } from "../model";
import { loadSavedChats, saveChats } from "../storage";

type Options = { accessToken: string | null; authReady: boolean; enabled: boolean };

function createChatId() {
  return `chat-${crypto.randomUUID()}`;
}

/** Owns chat history, AI requests, and export without leaking persistence details to UI. */
export function useTravelChat({ accessToken, authReady, enabled }: Options) {
  const [question, setQuestion] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [savedChats, setSavedChats] = useState<SavedChat[]>([]);
  // Keep the first server and browser render identical; a unique ID is created
  // only after hydration or when the user starts a new conversation.
  const [activeChatId, setActiveChatId] = useState("current");
  const [historyOpen, setHistoryOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const historyPanelRef = useRef<HTMLDivElement>(null);
  const savedChatsRef = useRef<SavedChat[]>([]);

  const replaceSavedChats = (next: SavedChat[]) => {
    savedChatsRef.current = next;
    setSavedChats(next);
    saveChats(next);
  };

  useChatScroll(chatScrollRef, chatMessages, aiBusy);
  useEffect(() => {
    if (!enabled || !authReady) return;
    let cancelled = false;
    if (!accessToken) {
      queueMicrotask(() => {
        if (cancelled) return;
        replaceSavedChats(loadSavedChats());
        setChatMessages([]);
        setActiveChatId(createChatId());
      });
      return () => { cancelled = true; };
    }
    const headers = { Authorization: `Bearer ${accessToken}` };
    void fetch("/api/chats", { headers })
      .then(async (response) => {
        if (!response.ok) throw new Error("无法读取云端历史记录。");
        return (await response.json() as { chats?: SavedChat[] }).chats || [];
      })
      .then(async (cloudChats) => {
        if (cancelled) return;
        const chats = cloudChats.length ? cloudChats : loadSavedChats();
        if (!cloudChats.length && chats.length) {
          await Promise.all(chats.map((chat) => fetch("/api/chats", { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ chat }) })));
        }
        if (cancelled) return;
        replaceSavedChats(chats);
        setChatMessages(chats[0]?.messages || []);
        setActiveChatId(chats[0]?.id || createChatId());
      })
      .catch(() => {
        if (!cancelled) replaceSavedChats(loadSavedChats());
      });
    return () => { cancelled = true; };
  }, [accessToken, authReady, enabled]);
  useEffect(() => {
    if (process.env.NODE_ENV !== "development" || !chatMessages.length) return;
    const latest = chatMessages.at(-1)!;
    console.debug("[chat] rendered message fields", latest);
  }, [chatMessages]);

  const saveChat = (messages: ChatMessage[], chatId = activeChatId) => {
    const title = messages.find((message) => message.role === "user")?.content.slice(0, 18) || "新对话";
    const previous = savedChatsRef.current.find((chat) => chat.id === chatId);
    const chat: SavedChat = { id: chatId, title, createdAt: previous?.createdAt ?? Date.now(), updatedAt: Date.now(), messages };
    const next = [chat, ...savedChatsRef.current.filter((item) => item.id !== chatId)]
      .sort((first, second) => second.updatedAt - first.updatedAt)
      .slice(0, 20);
    replaceSavedChats(next);
    if (accessToken) void fetch("/api/chats", { method: "PUT", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ chat }) });
  };

  const sendQuestion = async (userMessage: string, history: ChatMessage[], chatId: string) => {
    const messagesWithQuestion = [...history, { role: "user" as const, content: userMessage }];
    setChatMessages(messagesWithQuestion);
    setAiBusy(true);
    try {
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMessage, history }) });
      const data = await response.json();
      const messages = [...messagesWithQuestion, normalizeAssistantResponse(data.reply ?? data, data.error || "暂时无法生成回复。")];
      setChatMessages(messages);
      saveChat(messages, chatId);
    } catch {
      const messages = [...messagesWithQuestion, { role: "assistant" as const, content: "无法连接 AI 服务，请检查本地预览是否正在运行。" }];
      setChatMessages(messages);
      saveChat(messages, chatId);
    } finally {
      setAiBusy(false);
    }
  };

  const ask = async () => {
    if (!question.trim() || aiBusy) return;
    const userMessage = question.trim();
    setQuestion("");
    await sendQuestion(userMessage, chatMessages, activeChatId);
  };

  const newChat = () => {
    setActiveChatId(createChatId());
    setChatMessages([]);
    setQuestion("");
    setHistoryOpen(false);
  };
  const startNewChatAndAsk = (prompt: string) => {
    if (!prompt.trim() || aiBusy) return;
    const chatId = createChatId();
    setActiveChatId(chatId);
    setChatMessages([]);
    setQuestion("");
    setHistoryOpen(false);
    void sendQuestion(prompt.trim(), [], chatId);
  };
  const openChat = (chat: SavedChat) => {
    setActiveChatId(chat.id);
    setChatMessages(chat.messages);
    setHistoryOpen(false);
  };
  const deleteChat = (chatId: string) => {
    if (!window.confirm("确定删除这段云端对话吗？此操作无法撤销。")) return;
    replaceSavedChats(savedChatsRef.current.filter((chat) => chat.id !== chatId));
    if (accessToken) void fetch(`/api/chats?id=${encodeURIComponent(chatId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
    if (chatId === activeChatId) newChat();
  };
  const exportChat = () => {
    if (!chatMessages.length) return;
    const title = savedChats.find((chat) => chat.id === activeChatId)?.title || "途遇 AI 对话";
    downloadChatTranscript(title, chatMessages);
  };

  return { activeChatId, aiBusy, ask, chatMessages, chatScrollRef, deleteChat, exportChat, historyOpen, historyPanelRef, newChat, openChat, question, savedChats, setHistoryOpen, setQuestion, startNewChatAndAsk };
}
