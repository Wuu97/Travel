import type { AiRequest } from "./requestValidation";

export type AiReply = { content: string; itineraryItems: []; expenseItems: [] };

const SYSTEM_PROMPT = "你是途遇的中文旅行助手。回答简洁、实用、友好。可以规划行程、估算预算、推荐本地体验。不要编造实时票价或余票；遇到这类问题，明确建议用户前往官方平台确认。请使用清晰的 Markdown：用 ## 表示小标题、用 - 表示列表、用 **加粗** 强调重点；不要使用 --- 分隔线，不要把所有内容挤在一段里。";

export async function requestTravelAdvice({ context, history, message }: AiRequest): Promise<AiReply> {
  const rawKey = process.env.DEEPSEEK_API_KEY?.trim();
  const apiKey = rawKey?.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, "$1$2");
  if (!apiKey) throw new Error("尚未配置 DeepSeek API Key。请在 .env.local 中设置 DEEPSEEK_API_KEY 后重启预览服务。");
  const response = await fetch("https://api.deepseek.com/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ model: "deepseek-chat", messages: [{ role: "system", content: SYSTEM_PROMPT }, ...(context ? [{ role: "system" as const, content: `仅在问题与当前行程相关时参考：${context}` }] : []), ...history, { role: "user", content: message }], temperature: 0.7, max_tokens: 700 }) });
  if (!response.ok) throw new Error(response.status === 401 ? "DeepSeek 认证失败（401）：请确认 .env.local 中的 Key 完整、有效，并来自 DeepSeek 开放平台。" : `DeepSeek 请求失败（${response.status}）`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  return { content: data.choices?.[0]?.message?.content || "暂时没有生成回复，请再试一次。", itineraryItems: [], expenseItems: [] };
}
