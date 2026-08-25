import type { ExpenseItem, ItineraryItem } from "../trip/model";

export type RichPlace = { name: string; category?: string; area?: string; description?: string; rating?: string | number; reviewCount?: string; price?: string; openingHours?: string; recommendedDuration?: string; imageUrl?: string; itineraryItem?: ItineraryItem };
export type RichRestaurant = { name: string; cuisine?: string; area?: string; description?: string; rating?: string | number; reviewCount?: string; averagePrice?: string; openingHours?: string; recommendedDishes?: string[]; imageUrl?: string; itineraryItem?: ItineraryItem };
export type RichRoute = { from?: string; to?: string; mode?: string; duration?: string; distance?: string; cost?: string; description?: string; itineraryItem?: ItineraryItem };
export type RichCost = { label: string; amount: string; note?: string; total?: string; perPerson?: string };
export type RichImage = { url: string; alt?: string };
export type RichContent = { places?: RichPlace[]; restaurants?: RichRestaurant[]; routes?: RichRoute[]; costs?: RichCost[]; images?: RichImage[] };

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  itineraryItems?: ItineraryItem[];
  expenseItems?: ExpenseItem[];
  richContent?: RichContent;
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
  const text = typeof objectContent?.text === "string" ? objectContent.text : partsContent;
  return {
    role: raw.role,
    content: typeof content === "string" ? content : text,
    itineraryItems: Array.isArray(raw.itineraryItems) ? raw.itineraryItems as ItineraryItem[] : [],
    expenseItems: Array.isArray(raw.expenseItems) ? raw.expenseItems as ExpenseItem[] : [],
    richContent: raw.richContent && typeof raw.richContent === "object" ? raw.richContent as RichContent : undefined,
  };
}

export function normalizeAssistantResponse(value: unknown, fallback: string): ChatMessage {
  let payload: unknown = value;
  if (typeof payload === "string") {
    const rawPayload = payload;
    try { payload = JSON.parse(rawPayload); }
    catch { return { role: "assistant", content: rawPayload, itineraryItems: [], expenseItems: [] }; }
  }
  const message = normalizeChatMessage({ ...(payload && typeof payload === "object" ? payload : {}), role: "assistant" });
  return message && message.content.trim() ? message : { role: "assistant", content: fallback, itineraryItems: [], expenseItems: [] };
}
