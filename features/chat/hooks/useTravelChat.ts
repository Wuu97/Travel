import { useCallback, useEffect, useRef, useState } from "react";
import { downloadChatTranscript } from "../export";
import { useChatScroll } from "./useChatScroll";
import { normalizeAssistantResponse, type ChatMessage, type SavedChat } from "../model";
import { loadSavedChats, saveChats } from "../storage";
import { useConfirmation } from "../../shared/components/ConfirmDialog";
import type { TravelContext } from "../../ai/schemas/context";
import { readFeedbackEvents } from "../../ai/feedback";

type Options = { accessToken: string | null; authReady: boolean; enabled: boolean; storageScope: string };

function createChatId() {
  return `chat-${crypto.randomUUID()}`;
}

function mergeChats(localChats: SavedChat[], cloudChats: SavedChat[]) {
  const byId = new Map<string, SavedChat>();
  for (const chat of [...localChats, ...cloudChats]) {
    const existing = byId.get(chat.id);
    if (!existing || chat.updatedAt >= existing.updatedAt) byId.set(chat.id, chat);
  }
  return [...byId.values()].sort((first, second) => second.updatedAt - first.updatedAt).slice(0, 20);
}

/** Owns chat history, AI requests, and export without leaking persistence details to UI. */
export function useTravelChat({ accessToken, authReady, enabled, storageScope }: Options) {
  const { confirm } = useConfirmation();
  const [question, setQuestion] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  // TravelApp remounts this hook after client hydration. Seed from the local
  // copy during that remount so a refresh never flashes an empty history while
  // the authenticated cloud request is still in flight.
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() =>
    enabled && typeof window !== "undefined" ? loadSavedChats(storageScope)[0]?.messages || [] : [],
  );
  const [savedChats, setSavedChats] = useState<SavedChat[]>(() =>
    enabled && typeof window !== "undefined" ? loadSavedChats(storageScope) : [],
  );
  // Keep the first server and browser render identical; a unique ID is created
  // only after hydration or when the user starts a new conversation.
  const [activeChatId, setActiveChatId] = useState(() =>
    enabled && typeof window !== "undefined" ? loadSavedChats(storageScope)[0]?.id || "current" : "current",
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const historyPanelRef = useRef<HTMLDivElement>(null);
  const savedChatsRef = useRef<SavedChat[]>(
    enabled && typeof window !== "undefined" ? loadSavedChats(storageScope) : [],
  );
  const travelContextRef = useRef<TravelContext | undefined>(undefined);
  const setTravelContext = useCallback((travelContext: TravelContext | undefined) => { travelContextRef.current = travelContext; }, []);

  const replaceSavedChats = useCallback((next: SavedChat[]) => {
    savedChatsRef.current = next;
    setSavedChats(next);
    saveChats(next, storageScope);
  }, [storageScope]);

  useChatScroll(chatScrollRef, chatMessages, aiBusy);
  useEffect(() => {
    if (!enabled || !authReady) return;
    let cancelled = false;
    if (!accessToken) {
      queueMicrotask(() => {
        if (cancelled) return;
        const localChats = loadSavedChats(storageScope);
        replaceSavedChats(localChats);
        setChatMessages(localChats[0]?.messages || []);
        setActiveChatId(localChats[0]?.id || createChatId());
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
        // A previous background upload may not have completed before refresh.
        // Merge rather than treating an empty cloud response as an empty history.
        const chats = mergeChats(loadSavedChats(storageScope), cloudChats);
        if (cancelled) return;
        replaceSavedChats(chats);
        setChatMessages(chats[0]?.messages || []);
        setActiveChatId(chats[0]?.id || createChatId());

        const cloudById = new Map(cloudChats.map((chat) => [chat.id, chat]));
        await Promise.all(chats
          .filter((chat) => !cloudById.get(chat.id) || chat.updatedAt > cloudById.get(chat.id)!.updatedAt)
          .map((chat) => fetch("/api/chats", { method: "PUT", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ chat }) })));
      })
      .catch(() => {
        // Network or database failures must never erase the browser copy.
        if (!cancelled) {
          const localChats = loadSavedChats(storageScope);
          replaceSavedChats(localChats);
          setChatMessages(localChats[0]?.messages || []);
        }
      });
    return () => { cancelled = true; };
  }, [accessToken, authReady, enabled, replaceSavedChats, storageScope]);
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
      const feedbackEvents = readFeedbackEvents();
      const response = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json", ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) }, body: JSON.stringify({ message: userMessage, history, ...(travelContextRef.current ? { travelContext: travelContextRef.current } : {}), ...(feedbackEvents.length ? { feedbackEvents } : {}) }) });
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

  const newChat = (draft = "") => {
    setActiveChatId(createChatId());
    setChatMessages([]);
    setQuestion(typeof draft === "string" ? draft : "");
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
  const deleteChat = async (chatId: string) => {
    if (!await confirm({ title: "删除对话？", description: "这段对话将被永久删除，且无法恢复。" })) return;
    replaceSavedChats(savedChatsRef.current.filter((chat) => chat.id !== chatId));
    if (accessToken) void fetch(`/api/chats?id=${encodeURIComponent(chatId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
    if (chatId === activeChatId) newChat();
  };
  const exportChat = () => {
    if (!chatMessages.length) return;
    const title = savedChats.find((chat) => chat.id === activeChatId)?.title || "途遇 AI 对话";
    downloadChatTranscript(title, chatMessages);
  };

  return { activeChatId, aiBusy, ask, chatMessages, chatScrollRef, deleteChat, exportChat, historyOpen, historyPanelRef, newChat, openChat, question, savedChats, setHistoryOpen, setQuestion, setTravelContext, startNewChatAndAsk };
}
