import { isItineraryType, type ExpenseItem, type ItineraryItem } from "../trip/model";
import type { TravelImage } from "../ai/image/types";
import { normalizeTravelImages } from "../ai/image/normalization";
import { parseStructuredTravelResponse } from "../ai/parser/travel-response-parser";
import type { StructuredTravelResponse } from "../ai/schemas/travel-response";

export type RichPlace = { name: string; category?: string; area?: string; description?: string; rating?: string | number; reviewCount?: string; price?: string; openingHours?: string; recommendedDuration?: string; imageUrl?: string; images?: TravelImage[]; itineraryItem?: ItineraryItem };
export type RichRestaurant = { name: string; cuisine?: string; area?: string; description?: string; rating?: string | number; reviewCount?: string; averagePrice?: string; openingHours?: string; recommendedDishes?: string[]; imageUrl?: string; images?: TravelImage[]; itineraryItem?: ItineraryItem };
export type RichRoute = { from?: string; to?: string; mode?: string; duration?: string; distance?: string; cost?: string; description?: string; itineraryItem?: ItineraryItem };
export type RichCostItem = { label: string; amount: string; note?: string };
export type RichCostSummary = { items: RichCostItem[]; total?: string; perPerson?: string };
export type RichImage = { url: string; alt?: string };
export type RichContent = { places?: RichPlace[]; restaurants?: RichRestaurant[]; routes?: RichRoute[]; costs?: RichCostSummary; images?: RichImage[] };

const asRecord = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
const display = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value).trim() || undefined : undefined;
const list = (value: unknown) => Array.isArray(value) ? value : [];
const dedupe = <T>(items: T[], key: (item: T) => string, limit: number) => items.filter((item, index, all) => all.findIndex((candidate) => key(candidate) === key(item)) === index).slice(0, limit);
const imageUrl = (value: unknown) => { const url = text(value); return url && /^(https?:|blob:|\/data\/)/i.test(url) ? url : undefined; };
const itineraryItem = (value: unknown): ItineraryItem | undefined => { const item = asRecord(value); const title = text(item?.title); const type = item?.type; if (!title || !isItineraryType(type)) return undefined; return { id: text(item?.id) || `rich-${title}-${type}`, title, type, day: typeof item?.day === "number" ? item.day : undefined, date: text(item?.date), time: text(item?.time), location: text(item?.location), note: text(item?.note), creator: text(item?.creator) }; };
const dishes = (value: unknown) => dedupe(list(value).map(text).filter((item): item is string => Boolean(item)), (item) => item.toLowerCase(), 8);
const providerImages = (value: unknown) => Array.isArray(value) ? normalizeTravelImages(value.map((item) => {
  const image = asRecord(item);
  return { url: image?.url, alt: image?.alt, sourceUrl: image?.sourceUrl };
}), (() => { const first = asRecord(value[0]); return { source: first?.source === "search" ? "search" : "provider", ...(text(first?.provider) ? { provider: text(first?.provider) } : {}) }; })()) : undefined;
const common = (raw: Record<string, unknown>) => {
  const images = providerImages(raw.images);
  return { area: text(raw.area), description: text(raw.description), rating: display(raw.rating), reviewCount: display(raw.reviewCount), openingHours: text(raw.openingHours), ...(images?.length ? { images, imageUrl: images[0].url } : { imageUrl: imageUrl(raw.imageUrl) }), itineraryItem: itineraryItem(raw.itineraryItem) };
};

export function normalizeRichContent(value: unknown): RichContent | undefined {
  const raw = asRecord(value); if (!raw) return undefined;
  const places = dedupe(list(raw.places).map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item)).flatMap((item): RichPlace[] => { const name = text(item.name); return name ? [{ name, category: text(item.category), price: display(item.price), recommendedDuration: text(item.recommendedDuration), ...common(item) }] : []; }), (item) => item.name.toLowerCase(), 8);
  const restaurants = dedupe(list(raw.restaurants).map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item)).flatMap((item): RichRestaurant[] => { const name = text(item.name); return name ? [{ name, cuisine: text(item.cuisine), averagePrice: display(item.averagePrice), recommendedDishes: dishes(item.recommendedDishes), ...common(item) }] : []; }), (item) => item.name.toLowerCase(), 8);
  const routes = dedupe(list(raw.routes).map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item)).flatMap((item): RichRoute[] => { const from = text(item.from), to = text(item.to); return from || to ? [{ from, to, mode: text(item.mode), duration: text(item.duration), distance: text(item.distance), cost: display(item.cost), description: text(item.description), itineraryItem: itineraryItem(item.itineraryItem) }] : []; }), (item) => `${item.from || ""}|${item.to || ""}|${item.mode || ""}`.toLowerCase(), 6);
  const costSource = Array.isArray(raw.costs) ? { items: raw.costs, total: undefined, perPerson: undefined } : asRecord(raw.costs);
  const costItems = list(costSource?.items).map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item)).flatMap((item): RichCostItem[] => { const label = text(item.label), amount = display(item.amount); return label && amount ? [{ label, amount, note: text(item.note) }] : []; });
  const costs = costSource && (costItems.length || display(costSource.total) || display(costSource.perPerson)) ? { items: costItems, total: display(costSource.total), perPerson: display(costSource.perPerson) } : undefined;
  const images = dedupe(list(raw.images).map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item)).flatMap((item): RichImage[] => { const url = imageUrl(item.url); return url ? [{ url, alt: text(item.alt) }] : []; }), (item) => item.url, 4);
  return places.length || restaurants.length || routes.length || costs || images.length ? { ...(places.length ? { places } : {}), ...(restaurants.length ? { restaurants } : {}), ...(routes.length ? { routes } : {}), ...(costs ? { costs } : {}), ...(images.length ? { images } : {}) } : undefined;
}

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  itineraryItems?: ItineraryItem[];
  expenseItems?: ExpenseItem[];
  richContent?: RichContent;
  structuredTravelResponse?: StructuredTravelResponse;
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
  const structured = raw.structuredTravelResponse === undefined ? undefined : parseStructuredTravelResponse(raw.structuredTravelResponse);
  return {
    role: raw.role,
    content: typeof content === "string" ? content : text,
    itineraryItems: Array.isArray(raw.itineraryItems) ? raw.itineraryItems as ItineraryItem[] : [],
    expenseItems: Array.isArray(raw.expenseItems) ? raw.expenseItems as ExpenseItem[] : [],
    richContent: normalizeRichContent(raw.richContent),
    ...(structured?.isStructured ? { structuredTravelResponse: structured.response } : {}),
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
