import type { ExpenseItem, ItineraryItem } from "../trip/model";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  itineraryItems?: ItineraryItem[];
  expenseItems?: ExpenseItem[];
};

export type SavedChat = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
};

export function normalizeChatMessage(value: unknown): ChatMessage | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (raw.role !== "user" && raw.role !== "assistant") return null;
  const objectContent = raw.content && typeof raw.content === "object" ? raw.content as Record<string, unknown> : null;
  const partsContent = Array.isArray(raw.parts)
    ? raw.parts.map((part) => typeof part === "string" ? part : part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string" ? (part as Record<string, string>).text : "").join("")
    : "";
  const content = typeof raw.content === "string" ? raw.content : typeof raw.markdown === "string" ? raw.markdown : typeof raw.text === "string" ? raw.text : typeof objectContent?.text === "string" ? objectContent.text : partsContent;
  return {
    role: raw.role,
    content,
    itineraryItems: Array.isArray(raw.itineraryItems) ? raw.itineraryItems as ItineraryItem[] : [],
    expenseItems: Array.isArray(raw.expenseItems) ? raw.expenseItems as ExpenseItem[] : [],
  };
}

export function normalizeAssistantResponse(value: unknown, fallback: string): ChatMessage {
  let payload = value;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); }
    catch { return { role: "assistant", content: payload, itineraryItems: [], expenseItems: [] }; }
  }
  const message = normalizeChatMessage({ ...(payload && typeof payload === "object" ? payload : {}), role: "assistant" });
  return message && message.content.trim() ? message : { role: "assistant", content: fallback, itineraryItems: [], expenseItems: [] };
}
