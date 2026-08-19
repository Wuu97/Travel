import { normalizeChatMessage, type ChatMessage, type SavedChat } from "./model";

const CHAT_HISTORY_KEY = "tuyu-ai-history";

export function loadSavedChats(): SavedChat[] {
  if (typeof window === "undefined") return [];
  try {
    return (JSON.parse(localStorage.getItem(CHAT_HISTORY_KEY) || "[]") as Array<Partial<SavedChat>>)
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
      .sort((first, second) => second.createdAt - first.createdAt);
  } catch {
    return [];
  }
}

export function saveChats(chats: SavedChat[]) {
  localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chats));
}
