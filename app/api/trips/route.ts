import { createSupabaseServerClient } from "../../../features/auth/supabase";
import { isStoredTrip } from "../../../features/trip/snapshotValidation";
import { getTripId } from "../../../features/trip/tripId";

function getAccessToken(request: Request) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7) : null;
}

async function getAuthenticatedClient(request: Request) {
  const accessToken = getAccessToken(request);
  const client = accessToken ? createSupabaseServerClient(accessToken) : null;
  if (!client) return { error: Response.json({ error: "Supabase 云端服务尚未配置。" }, { status: 503 }) };
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) return { error: Response.json({ error: "请先登录后查看共享行程。" }, { status: 401 }) };
  return { client, userId: data.user.id };
}

export async function GET(request: Request) {
  try {
    const context = await getAuthenticatedClient(request);
    if ("error" in context) return context.error;
    const tripId = getTripId(request);
    const { data: row, error } = await context.client.from("trip_snapshots").select("payload, updated_at").eq("id", tripId).maybeSingle();
    if (error) return Response.json({ error: error.message }, { status: 502 });
    if (!row) return Response.json({ trip: null });

    const trip = row.payload;
    if (!isStoredTrip(trip)) {
      return Response.json({ error: "保存的行程数据无效。" }, { status: 500 });
    }

    return Response.json({ trip, updatedAt: row.updated_at });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "无法读取共享行程。" },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const context = await getAuthenticatedClient(request);
    if ("error" in context) return context.error;
    let body: { trip?: unknown };
    try {
      body = (await request.json()) as { trip?: unknown };
    } catch {
      return Response.json({ error: "请求格式无效。" }, { status: 400 });
    }
    if (!isStoredTrip(body.trip)) {
      return Response.json({ error: "行程数据格式无效。" }, { status: 400 });
    }

    const tripId = getTripId(request);
    const updatedAt = Date.now();
    const { error } = await context.client.from("trip_snapshots").upsert({ id: tripId, user_id: context.userId, payload: body.trip, updated_at: updatedAt }, { onConflict: "id,user_id" });
    if (error) return Response.json({ error: error.message }, { status: 502 });
    return Response.json({ updatedAt });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "无法保存共享行程。" },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getAuthenticatedClient(request);
    if ("error" in context) return context.error;
    const tripId = getTripId(request);
    const { error } = await context.client.from("trip_snapshots").delete().eq("id", tripId);
    if (error) return Response.json({ error: error.message }, { status: 502 });
    return Response.json({ deleted: true });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "无法删除共享行程。" },
      { status: 503 },
    );
  }
}
