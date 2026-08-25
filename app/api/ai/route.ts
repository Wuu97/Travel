import { requestTravelAdvice } from "../../../features/ai/core/orchestrator";
import { parseAiRequest } from "../../../features/chat/requestValidation";

export async function POST(request: Request) {
  let payload;
  try {
    payload = parseAiRequest(await request.json());
  } catch {
    return Response.json({ error: "请求格式无效。" }, { status: 400 });
  }
  if (!payload) return Response.json({ error: "请输入有效的旅行问题。" }, { status: 400 });
  try {
    return Response.json({ reply: await requestTravelAdvice(payload) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 服务暂时不可用。";
    return Response.json({ error: message }, { status: message.startsWith("尚未配置") ? 503 : 502 });
  }
}
