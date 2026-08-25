import { requireSupabaseUser } from "../../../../features/auth/supabase";
import { createTravelMemoryRepository, type MemoryRepositoryClient } from "../../../../features/memory/repository";

type RouteContext = { params: Promise<{ id?: string }> };

export async function DELETE(request: Request, { params }: RouteContext) {
  const context = await requireSupabaseUser(request, "请先登录后删除旅行偏好。");
  if ("error" in context) return context.error;
  const { id } = await params;
  if (!id) return Response.json({ error: "旅行偏好 ID 无效。" }, { status: 400 });
  try {
    await createTravelMemoryRepository(context.client as unknown as MemoryRepositoryClient).deleteMemory(context.userId, id);
    return Response.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "暂时无法删除旅行偏好。";
    return Response.json({ error: message }, { status: 502 });
  }
}
