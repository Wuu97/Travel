import { parseAiRequest } from "../validation";

type ItineraryItem = { id: string; title: string; type: "景点" | "餐饮" | "活动" | "交通" | "住宿" | "其他"; day?: number; date?: string; time?: string; note?: string };
type ExpenseItem = { id: string; title: string; amount: number; type: "住宿" | "餐饮" | "交通" | "门票" | "活动" | "其他"; occurrence: "estimated" | "actual"; relatedItineraryItemId?: string; relatedItineraryTitle?: string; note?: string };
type AiPayload = { content: string; itineraryItems?: ItineraryItem[]; expenseItems?: ExpenseItem[] };

export async function POST(request: Request) {
  let payload;
  try {
    payload = parseAiRequest(await request.json());
  } catch {
    return Response.json({ error: "请求格式无效。" }, { status: 400 });
  }
  if (!payload) return Response.json({ error: "请输入有效的旅行问题。" }, { status: 400 });

  const { message, context, history } = payload;
  const rawApiKey = process.env.DEEPSEEK_API_KEY?.trim();
  // Accept a key pasted with optional surrounding quotes in .env.local.
  const apiKey = rawApiKey?.replace(/^(?:"([\s\S]*)"|'([\s\S]*)')$/, "$1$2");

  if (!apiKey) {
    return Response.json({ error: "尚未配置 DeepSeek API Key。请在 .env.local 中设置 DEEPSEEK_API_KEY 后重启预览服务。" }, { status: 503 });
  }
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: "你是途遇的中文旅行助手。回答简洁、实用、友好。可以规划行程、估算预算、推荐本地体验。不要编造实时票价或余票；遇到这类问题，明确建议用户前往官方平台确认。请使用清晰的 Markdown：用 ## 表示小标题、用 - 表示列表、用 **加粗** 强调重点；不要使用 --- 分隔线，不要把所有内容挤在一段里。" },
          ...(context ? [{ role: "system" as const, content: `仅在问题与当前行程相关时参考：${context}` }] : []),
          ...history,
          { role: "user", content: message },
        ],
        temperature: 0.7,
        max_tokens: 700,
      }),
    });
    if (!response.ok) {
      const detail = response.status === 401
        ? "DeepSeek 认证失败（401）：请确认 .env.local 中的 Key 完整、有效，并来自 DeepSeek 开放平台。"
        : `DeepSeek 请求失败（${response.status}）`;
      throw new Error(detail);
    }
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const rawReply = data.choices?.[0]?.message?.content ?? "";
    if (process.env.NODE_ENV === "development") console.debug("[chat api] raw model response", rawReply);
    const reply: AiPayload = { content: rawReply || "暂时没有生成回复，请再试一次。", itineraryItems: [], expenseItems: [] };
    if (process.env.NODE_ENV === "development") console.debug("[chat api] normalized import payload", { itineraryItems: reply.itineraryItems, expenseItems: reply.expenseItems });
    return Response.json({ reply });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "AI 服务暂时不可用。" }, { status: 502 });
  }
}
