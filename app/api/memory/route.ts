import { requireSupabaseUser } from "../../../features/auth/supabase";
import { createTravelMemoryRepository, type MemoryRepositoryClient } from "../../../features/memory/repository";

export async function GET(request: Request) {
  const context = await requireSupabaseUser(request, "请先登录后查看旅行偏好。");
  if ("error" in context) return context.error;
  try {
    const memories = await createTravelMemoryRepository(context.client as unknown as MemoryRepositoryClient).getUserMemories(context.userId);
    return Response.json({ memories });
  } catch (error) {
    const message = error instanceof Error ? error.message : "暂时无法读取旅行偏好。";
    return Response.json({ error: message }, { status: 502 });
  }
}
