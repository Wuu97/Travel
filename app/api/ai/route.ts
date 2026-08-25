import { requestTravelAdvice } from "../../../features/ai/core/orchestrator";
import { parseAiRequest } from "../../../features/chat/requestValidation";
import { createSupabaseServerClient, getBearerAccessToken } from "../../../features/auth/supabase";
import { createTravelMemoryRepository, type MemoryRepositoryClient } from "../../../features/memory/repository";

async function getMemoryLoader(request: Request) {
  const accessToken = getBearerAccessToken(request);
  const client = accessToken ? createSupabaseServerClient(accessToken) : null;
  if (!client) return undefined;
  const { data, error } = await client.auth.getUser(accessToken ?? undefined);
  if (error || !data.user) return undefined;
  const repository = createTravelMemoryRepository(client as unknown as MemoryRepositoryClient);
  return () => repository.getUserMemories(data.user.id);
}

export async function POST(request: Request) {
  let payload;
  try {
    payload = parseAiRequest(await request.json());
  } catch {
    return Response.json({ error: "请求格式无效。" }, { status: 400 });
  }
  if (!payload) return Response.json({ error: "请输入有效的旅行问题。" }, { status: 400 });
  try {
    const loadMemories = await getMemoryLoader(request).catch(() => undefined);
    return Response.json({ reply: await requestTravelAdvice({ ...payload, loadMemories }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 服务暂时不可用。";
    return Response.json({ error: message }, { status: message.startsWith("尚未配置") ? 503 : 502 });
  }
}
