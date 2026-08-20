import type { AiRequest } from "./requestValidation";
import type { ExpenseItem, ItineraryItem } from "../trip/model";

export type AiReply = { content: string; itineraryItems: ItineraryItem[]; expenseItems: ExpenseItem[] };

const itineraryTypes = ["景点", "餐饮", "活动", "交通", "住宿", "购物", "其他"] as const;
type ItineraryType = (typeof itineraryTypes)[number];

const SYSTEM_PROMPT = "你是途遇的中文旅行助手。回答简洁、实用、友好。可以规划行程、估算预算、推荐本地体验。不要编造实时票价或余票；遇到这类问题，明确建议用户前往官方平台确认。必须只返回合法 JSON，格式为 {\"content\":\"Markdown 格式的回复\",\"itineraryItems\":[{\"title\":\"条目名称\",\"type\":\"景点|餐饮|活动|交通|住宿|购物|其他\",\"day\":1,\"time\":\"12:00\",\"location\":\"地点\",\"note\":\"备注\"}],\"expenseItems\":[]}。没有可导入条目时返回空数组。当用户询问吃什么、餐厅、早餐、午餐、晚餐、咖啡或夜宵时，将每个餐食建议放入 itineraryItems，并且 type 必须为 \"餐饮\"。content 可以使用清晰的 Markdown：用 ## 表示小标题、用 - 表示列表、用 **加粗** 强调重点；不要使用 --- 分隔线。";

function isItineraryType(value: unknown): value is ItineraryType {
  return typeof value === "string" && itineraryTypes.includes(value as ItineraryType);
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

function parseAiReply(content: string): AiReply {
  const normalized = content.trim().replace(/^```json\s*|\s*```$/gi, "");
  try {
    const parsed = JSON.parse(normalized) as Record<string, unknown>;
    if (typeof parsed.content === "string" && parsed.content.trim()) {
      return { content: parsed.content.trim(), itineraryItems: parseItineraryItems(parsed.itineraryItems), expenseItems: [] };
    }
  } catch {
    // A plain-text response remains useful even when the provider misses the JSON contract.
  }
  return { content: content || "暂时没有生成回复，请再试一次。", itineraryItems: [], expenseItems: [] };
}

export async function requestTravelAdvice({ context, history, message }: AiRequest): Promise<AiReply> {
  const rawKey = process.env.DEEPSEEK_API_KEY?.trim();
  const apiKey = rawKey?.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, "$1$2");
  if (!apiKey) throw new Error("尚未配置 DeepSeek API Key。请在 .env.local 中设置 DEEPSEEK_API_KEY 后重启预览服务。");
  const response = await fetch("https://api.deepseek.com/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "system", content: SYSTEM_PROMPT }, ...(context ? [{ role: "system" as const, content: `仅在问题与当前行程相关时参考：${context}` }] : []), ...history, { role: "user", content: message }], temperature: 0.7, max_tokens: 700 }) });
  if (!response.ok) throw new Error(response.status === 401 ? "DeepSeek 认证失败（401）：请确认 .env.local 中的 Key 完整、有效，并来自 DeepSeek 开放平台。" : `DeepSeek 请求失败（${response.status}）`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return parseAiReply(data.choices?.[0]?.message?.content || "");
}
