import { requireSupabaseUser } from "../../../features/auth/supabase";
import { isStoredTrip } from "../../../features/trip/snapshotValidation";
import { getTripId } from "../../../features/trip/tripId";

const isVersion = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 1;

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalidTripId = () => Response.json({ error: "行程 ID 格式无效。" }, { status: 400 });

export async function GET(request: Request) {
  const context = await requireSupabaseUser(request, "请先登录后访问共享行程。");
  if ("error" in context) return context.error;
  const tripId = getTripId(request);
  if (!tripId) return invalidTripId();
  const { data, error } = await context.client.from("trips").select("payload, version, updated_at").eq("id", tripId).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 502 });
  if (!data) return Response.json({ trip: null });
  return isStoredTrip(data.payload)
    ? Response.json({ trip: data.payload, version: data.version, updatedAt: data.updated_at })
    : Response.json({ error: "保存的行程数据无效。" }, { status: 500 });
}

export async function PUT(request: Request) {
  const context = await requireSupabaseUser(request, "请先登录后访问共享行程。");
  if ("error" in context) return context.error;
  const body = await request.json().catch(() => null) as { trip?: unknown; version?: unknown } | null;
  if (!body || !isStoredTrip(body.trip) || (body.version !== undefined && !isVersion(body.version))) return Response.json({ error: "行程数据或版本号无效。" }, { status: 400 });
  const id = getTripId(request);
  if (!id) return invalidTripId();
  const updatedAt = Date.now();
  if (body.version === undefined) {
    const { error } = await context.client.from("trips").insert({ id, owner_id: context.userId, payload: body.trip, updated_at: updatedAt });
    if (error) return Response.json({ error: error.message }, { status: error.code === "23505" ? 409 : 502 });
    return Response.json({ version: 1, updatedAt }, { status: 201 });
  }
  const { data, error } = await context.client.from("trips").update({ payload: body.trip, version: body.version + 1, updated_at: updatedAt }).eq("id", id).eq("version", body.version).select("version, updated_at").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 502 });
  if (!data) return Response.json({ error: "行程已被更新或你没有编辑权限，请刷新后重试。" }, { status: 409 });
  return Response.json({ version: data.version, updatedAt: data.updated_at });
}

export async function POST(request: Request) {
  const context = await requireSupabaseUser(request, "请先登录后访问共享行程。");
  if ("error" in context) return context.error;
  const body = await request.json().catch(() => null) as { action?: string; token?: string } | null;
  if (body?.action === "accept" && typeof body.token === "string" && INVITE_TOKEN_PATTERN.test(body.token)) {
    const { data, error } = await context.client.rpc("accept_trip_invite", { invite_token: body.token });
    return error ? Response.json({ error: error.message }, { status: 400 }) : Response.json({ tripId: data });
  }
  if (body?.action === "create-invite") {
    const tripId = getTripId(request);
    if (!tripId) return invalidTripId();
    const token = crypto.randomUUID();
    const { error } = await context.client.from("trip_invites").insert({ token, trip_id: tripId, role: "editor", created_by: context.userId, created_at: Date.now(), expires_at: Date.now() + INVITE_TTL_MS });
    return error ? Response.json({ error: error.message }, { status: 403 }) : Response.json({ token });
  }
  return Response.json({ error: "邀请请求无效。" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const context = await requireSupabaseUser(request, "请先登录后访问共享行程。");
  if ("error" in context) return context.error;
  const tripId = getTripId(request);
  if (!tripId) return invalidTripId();
  const { error } = await context.client.from("trips").delete().eq("id", tripId);
  return error ? Response.json({ error: error.message }, { status: 502 }) : Response.json({ deleted: true });
}
