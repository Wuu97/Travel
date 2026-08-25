import type { AiRequest } from "./requestValidation";
import type { ExpenseItem, ItineraryItem } from "../trip/model";

export type AiReply = { content: string; richContent?: unknown; itineraryItems: ItineraryItem[]; expenseItems: ExpenseItem[] };

const itineraryTypes = ["景点", "餐饮", "活动", "交通", "住宿", "购物", "其他"] as const;
type ItineraryType = (typeof itineraryTypes)[number];
const expenseTypes = ["住宿", "餐饮", "交通", "门票", "活动", "其他"] as const;
type ExpenseType = (typeof expenseTypes)[number];

const SYSTEM_PROMPT = "你是途遇的中文旅行助手。回答简洁、实用、友好。只返回原始合法 JSON，不要 Markdown fence 或 HTML。顶层格式为 {answer:string,richContent?:{places?:[{name,category?,area?,description?,recommendedDuration?,itineraryItem?}],restaurants?:[{name,cuisine?,area?,description?,recommendedDishes?,itineraryItem?}],routes?:[{from?,to?,mode?,duration?,distance?,cost?,description?}],costs?:{items:[{label,amount,note?}],total?,perPerson?},images?:[{url,alt?}]},itineraryItems?:[],expenseItems?:[]}。answer 必须是 Markdown 正文，负责解释和建议，不要重复卡片事实字段。所有 richContent 字段可省略；景点和餐厅仅 name 必填，路线至少 from 或 to。评分、评论数、价格、营业时间、实时交通与图片 URL 没有可靠上下文时必须省略，绝不猜测或生成图片 URL；recommendedDuration 可作为建议生成。places 最多 6、restaurants 最多 6、routes 最多 4。普通知识、季节或文化问答只返回 answer；明确地点/餐厅推荐尽量同时给对应 rich card 与一致的 itineraryItem；完整行程规划才生成覆盖主要安排的 itineraryItems；仅预算问题、完整规划或明显费用估算才生成 expenseItems。richContent.costs 是展示字符串，expenseItems.amount 必须是 number、occurrence 为 estimated。itineraryItems 的 type 只能是 景点|餐饮|活动|交通|住宿|购物|其他；expenseItems 的 type 只能是 住宿|餐饮|交通|门票|活动|其他。";

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
    const answer = typeof parsed.answer === "string" && parsed.answer.trim() ? parsed.answer : typeof parsed.content === "string" && parsed.content.trim() ? parsed.content : "";
    if (answer) {
      return {
        content: answer.trim().replace(/\\n/g, "\n"),
        ...(parsed.richContent && typeof parsed.richContent === "object" ? { richContent: parsed.richContent } : {}),
        itineraryItems: parseItineraryItems(parsed.itineraryItems),
        expenseItems: parseExpenseItems(parsed.expenseItems),
      };
    }
  }

  // Do not leak a malformed response's import payload into the conversation.
  // The prose before that marker remains useful, while structured items are
  // intentionally omitted because their shape cannot be trusted.
  const payloadMarker = normalized.search(/[,\n]\s*"(?:richContent|itineraryItems|expenseItems)"\s*:/);
  const visibleText = (payloadMarker >= 0 ? normalized.slice(0, payloadMarker) : normalized)
    .replace(/^\s*\{?\s*"(?:answer|content)"\s*:\s*"?/, "")
    .replace(/"\s*$/, "")
    .replace(/\\n/g, "\n")
    .trim();
  return { content: visibleText || "暂时没有生成回复，请再试一次。", itineraryItems: [], expenseItems: [] };
}

export async function requestTravelAdvice({ context, history, message }: AiRequest): Promise<AiReply> {
  const rawKey = process.env.DEEPSEEK_API_KEY?.trim();
  const apiKey = rawKey?.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, "$1$2");
  if (!apiKey) throw new Error("尚未配置 DeepSeek API Key。请在 .env.local 中设置 DEEPSEEK_API_KEY 后重启预览服务。");
  const response = await fetch("https://api.deepseek.com/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: "deepseek-chat", response_format: { type: "json_object" }, messages: [{ role: "system", content: SYSTEM_PROMPT }, ...(context ? [{ role: "system" as const, content: `仅在问题与当前行程相关时参考：${context}` }] : []), ...history, { role: "user", content: message }], temperature: 0.7, max_tokens: 1200 }) });
  if (!response.ok) throw new Error(response.status === 401 ? "DeepSeek 认证失败（401）：请确认 .env.local 中的 Key 完整、有效，并来自 DeepSeek 开放平台。" : `DeepSeek 请求失败（${response.status}）`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return parseAiReply(data.choices?.[0]?.message?.content || "");
}
