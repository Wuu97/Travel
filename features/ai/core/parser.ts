import { isItineraryType, type ExpenseItem, type ItineraryItem } from "../../trip/model";
import type { AiReply } from "../schemas/response";
import { parseDataRequests } from "../schemas/dataRequests";
import { parseStructuredTravelResponse, structuredTravelResponseToRichContent } from "../parser/travel-response-parser";

const expenseTypes = ["住宿", "餐饮", "交通", "门票", "活动", "其他"] as const;
type ExpenseType = (typeof expenseTypes)[number];

function isExpenseType(value: unknown): value is ExpenseType {
  return typeof value === "string" && expenseTypes.includes(value as ExpenseType);
}

function parseItineraryItems(value: unknown): ItineraryItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    if (typeof raw.title !== "string" || !raw.title.trim() || !isItineraryType(raw.type)) return [];
    return [{
      id: typeof raw.id === "string" && raw.id.trim() ? raw.id : `ai-${Date.now()}-${index}`,
      title: raw.title.trim(), type: raw.type,
      ...(typeof raw.day === "number" && Number.isInteger(raw.day) && raw.day > 0 ? { day: raw.day } : {}),
      ...(typeof raw.date === "string" && raw.date.trim() ? { date: raw.date.trim() } : {}),
      ...(typeof raw.time === "string" && raw.time.trim() ? { time: raw.time.trim() } : {}),
      ...(typeof raw.location === "string" && raw.location.trim() ? { location: raw.location.trim() } : {}),
      ...(typeof raw.note === "string" && raw.note.trim() ? { note: raw.note.trim() } : {}),
    }];
  });
}

function parseExpenseItems(value: unknown): ExpenseItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const raw = item as Record<string, unknown>;
    if (typeof raw.title !== "string" || !raw.title.trim() || typeof raw.amount !== "number" || !Number.isFinite(raw.amount) || raw.amount < 0 || !isExpenseType(raw.type)) return [];
    return [{
      id: typeof raw.id === "string" && raw.id.trim() ? raw.id : `ai-expense-${Date.now()}-${index}`,
      title: raw.title.trim(), amount: Math.round(raw.amount * 100) / 100, type: raw.type,
      occurrence: raw.occurrence === "actual" ? "actual" : "estimated",
      ...(typeof raw.note === "string" && raw.note.trim() ? { note: raw.note.trim() } : {}),
      ...(typeof raw.relatedItineraryItemId === "string" && raw.relatedItineraryItemId.trim() ? { relatedItineraryItemId: raw.relatedItineraryItemId.trim() } : {}),
      ...(typeof raw.relatedItineraryTitle === "string" && raw.relatedItineraryTitle.trim() ? { relatedItineraryTitle: raw.relatedItineraryTitle.trim() } : {}),
    }];
  });
}

export function parseAiReply(content: string): AiReply {
  const normalized = content.trim().replace(/^```(?:json)?\s*|\s*```$/gi, "");
  let payload: unknown = normalized;
  for (let attempt = 0; attempt < 2 && typeof payload === "string"; attempt += 1) {
    try { payload = JSON.parse(payload); }
    catch { break; }
  }
  if (payload && typeof payload === "object") {
    const parsed = payload as Record<string, unknown>;
    const structured = parseStructuredTravelResponse(parsed);
    const answer = structured.response.answer;
    const dataRequests = parseDataRequests(parsed.dataRequests);
    if (answer) {
      // Provider photos are presentation data. The model may retain legacy imageUrl
      // fields, but cannot introduce a provider image collection.
      const structuredRichContent = structuredTravelResponseToRichContent(structured.response);
      const richContent: Record<string, unknown> | undefined = parsed.richContent && typeof parsed.richContent === "object"
        ? { ...(parsed.richContent as Record<string, unknown>) }
        : structuredRichContent ? { ...structuredRichContent } : undefined;
      if (richContent) {
        for (const collection of ["places", "restaurants"]) {
          if (Array.isArray(richContent[collection])) richContent[collection] = richContent[collection].map((item) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) return item;
            const candidate = { ...(item as Record<string, unknown>) };
            delete candidate.images;
            return candidate;
          });
        }
      }
      return {
      content: answer.trim().replace(/\\n/g, "\n"),
      ...(richContent ? { richContent } : {}),
      ...(structured.isStructured ? { structuredTravelResponse: structured.response } : {}),
      itineraryItems: parseItineraryItems(parsed.itineraryItems), expenseItems: parseExpenseItems(parsed.expenseItems), ...(dataRequests.length ? { dataRequests } : {}),
      };
    }
  }
  const payloadMarker = normalized.search(/[,\n]\s*"(?:richContent|dataRequests|itineraryItems|expenseItems)"\s*:/);
  const visibleText = (payloadMarker >= 0 ? normalized.slice(0, payloadMarker) : normalized)
    .replace(/^\s*\{?\s*"(?:answer|content)"\s*:\s*"?/, "").replace(/"\s*$/, "").replace(/\\n/g, "\n").trim();
  return { content: visibleText || "暂时没有生成回复，请再试一次。", itineraryItems: [], expenseItems: [] };
}
