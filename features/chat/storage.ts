import { normalizeChatMessage, type ChatMessage, type SavedChat } from "./model";

const CHAT_HISTORY_KEY = "tuyu-ai-history";

export function getChatStorageKey(userId?: string | null) {
  return `${CHAT_HISTORY_KEY}:${typeof userId === "string" && userId.trim() ? userId.trim() : "guest"}`;
}

export function loadSavedChats(userId?: string | null): SavedChat[] {
  if (typeof window === "undefined") return [];
  try {
    return (JSON.parse(localStorage.getItem(getChatStorageKey(userId)) || "[]") as Array<Partial<SavedChat>>)
      .filter((chat): chat is Partial<SavedChat> & Pick<SavedChat, "id" | "title" | "messages"> =>
        Boolean(chat.id && chat.title && Array.isArray(chat.messages)),
      )
      .map((chat) => ({
        id: chat.id,
        title: chat.title,
        messages: chat.messages.map(normalizeChatMessage).filter((message): message is ChatMessage => Boolean(message)),
        createdAt: typeof chat.createdAt === "number" ? chat.createdAt : typeof chat.updatedAt === "number" ? chat.updatedAt : Date.now(),
        updatedAt: typeof chat.updatedAt === "number" ? chat.updatedAt : Date.now(),
      }))
      .sort((first, second) => second.updatedAt - first.updatedAt);
  } catch {
    return [];
  }
}

export function saveChats(chats: SavedChat[], userId?: string | null) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getChatStorageKey(userId), JSON.stringify(chats));
  } catch {
    // Keep the in-memory conversation available when browser storage is full or unavailable.
  }
}
