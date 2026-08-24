import type { AiRequest } from "./requestValidation";
import type { ExpenseItem, ItineraryItem } from "../trip/model";

export type AiReply = { content: string; itineraryItems: ItineraryItem[]; expenseItems: ExpenseItem[] };

const itineraryTypes = ["景点", "餐饮", "活动", "交通", "住宿", "购物", "其他"] as const;
type ItineraryType = (typeof itineraryTypes)[number];
const expenseTypes = ["住宿", "餐饮", "交通", "门票", "活动", "其他"] as const;
type ExpenseType = (typeof expenseTypes)[number];

const SYSTEM_PROMPT = "你是途遇的中文旅行助手。回答简洁、实用、友好。可以规划行程、估算预算、推荐本地体验。不要编造实时票价或余票；遇到这类问题，明确建议用户前往官方平台确认。必须只返回合法 JSON，格式为 {\"content\":\"Markdown 格式的回复\",\"itineraryItems\":[{\"title\":\"条目名称\",\"type\":\"景点|餐饮|活动|交通|住宿|购物|其他\",\"day\":1,\"time\":\"12:00\",\"location\":\"地点\",\"note\":\"备注\"}],\"expenseItems\":[{\"title\":\"费用名称\",\"amount\":100,\"type\":\"住宿|餐饮|交通|门票|活动|其他\",\"occurrence\":\"estimated\",\"note\":\"估算说明\"}]}。路线规划、优化、推荐景点、餐厅、交通、住宿或购物时，必须为每一项建议生成 itineraryItems；购物建议的 type 必须为 \"购物\"。同时必须给出合理的 expenseItems 预算估算，occurrence 固定为 estimated。没有可导入条目时才返回空数组。当用户询问吃什么、餐厅、早餐、午餐、晚餐、咖啡或夜宵时，将每个餐食建议放入 itineraryItems，并且 type 必须为 \"餐饮\"。content 使用清晰 Markdown：用 ## 表示小标题、用 - 表示列表；所有时间段/行动标签、地点名称、交通方式、关键费用或注意事项必须用 **加粗**，例如 \"- **上午 09:00｜天山天池**：乘 **包车** 前往\"。不要使用 --- 分隔线。";

function isItineraryType(value: unknown): value is ItineraryType {
  return typeof value === "string" && itineraryTypes.includes(value as ItineraryType);
}

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
      title: raw.title.trim(),
      type: raw.type,
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
      title: raw.title.trim(),
      amount: Math.round(raw.amount * 100) / 100,
      type: raw.type,
      occurrence: raw.occurrence === "actual" ? "actual" : "estimated",
      ...(typeof raw.note === "string" && raw.note.trim() ? { note: raw.note.trim() } : {}),
      ...(typeof raw.relatedItineraryItemId === "string" && raw.relatedItineraryItemId.trim() ? { relatedItineraryItemId: raw.relatedItineraryItemId.trim() } : {}),
      ...(typeof raw.relatedItineraryTitle === "string" && raw.relatedItineraryTitle.trim() ? { relatedItineraryTitle: raw.relatedItineraryTitle.trim() } : {}),
    }];
  });
}

function parseAiReply(content: string): AiReply {
  const normalized = content.trim().replace(/^```(?:json)?\s*|\s*```$/gi, "");
  let payload: unknown = normalized;

  // Some providers return the JSON object as a JSON-encoded string. Unwrap it
  // before reading its fields, so escaped line breaks are rendered as Markdown.
  for (let attempt = 0; attempt < 2 && typeof payload === "string"; attempt += 1) {
    try { payload = JSON.parse(payload); }
    catch { break; }
  }
  if (payload && typeof payload === "object") {
    const parsed = payload as Record<string, unknown>;
    if (typeof parsed.content === "string" && parsed.content.trim()) {
      return {
        content: parsed.content.trim().replace(/\\n/g, "\n"),
        itineraryItems: parseItineraryItems(parsed.itineraryItems),
        expenseItems: parseExpenseItems(parsed.expenseItems),
      };
    }
  }

  // Do not leak a malformed response's import payload into the conversation.
  // The prose before that marker remains useful, while structured items are
  // intentionally omitted because their shape cannot be trusted.
  const payloadMarker = normalized.search(/[,\n]\s*"(?:itineraryItems|expenseItems)"\s*:/);
  const visibleText = (payloadMarker >= 0 ? normalized.slice(0, payloadMarker) : normalized)
    .replace(/^\s*\{?\s*"content"\s*:\s*"?/, "")
    .replace(/"\s*$/, "")
    .replace(/\\n/g, "\n")
    .trim();
  return { content: visibleText || "暂时没有生成回复，请再试一次。", itineraryItems: [], expenseItems: [] };
}

export async function requestTravelAdvice({ context, history, message }: AiRequest): Promise<AiReply> {
  const rawKey = process.env.DEEPSEEK_API_KEY?.trim();
  const apiKey = rawKey?.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, "$1$2");
  if (!apiKey) throw new Error("尚未配置 DeepSeek API Key。请在 .env.local 中设置 DEEPSEEK_API_KEY 后重启预览服务。");
  const response = await fetch("https://api.deepseek.com/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: "deepseek-chat", response_format: { type: "json_object" }, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...(context ? [{ role: "system" as const, content: `仅在问题与当前行程相关时参考：${context}` }] : []), ...history, { role: "user", content: message }], temperature: 0.7, max_tokens: 700 }) });
  if (!response.ok) throw new Error(response.status === 401 ? "DeepSeek 认证失败（401）：请确认 .env.local 中的 Key 完整、有效，并来自 DeepSeek 开放平台。" : `DeepSeek 请求失败（${response.status}）`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return parseAiReply(data.choices?.[0]?.message?.content || "");
}
