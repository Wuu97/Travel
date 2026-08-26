import { requireSupabaseUser } from "../../../features/auth/supabase";
import { isStoredTrip } from "../../../features/trip/snapshotValidation";
import { getTripId } from "../../../features/trip/tripId";
import type { TripLibraryItem } from "../../../features/trip/model";
import { membershipRoleToProductRole, productRoleToMembershipRole } from "../../../features/trip/members";

const isVersion = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 1;

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVITE_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalidTripId = () => Response.json({ error: "行程 ID 格式无效。" }, { status: 400 });

export async function GET(request: Request) {
  const context = await requireSupabaseUser(request, "请先登录后访问共享行程。");
  if ("error" in context) return context.error;
  const tripId = getTripId(request);
  const action = new URL(request.url).searchParams.get("action");
  if (action === "members") {
    const { data: trip, error: tripError } = await context.client.from("trips").select("owner_id").eq("id", tripId).maybeSingle();
    if (tripError) return Response.json({ error: tripError.message }, { status: 502 });
    if (!trip) return Response.json({ error: "无权访问该旅行成员。" }, { status: 403 });
    const { data, error } = await context.client.from("trip_members").select("user_id, role").eq("trip_id", tripId);
    if (error) return Response.json({ error: error.message }, { status: 502 });
    return Response.json({ canManage: trip.owner_id === context.userId, members: [{ userId: trip.owner_id, role: "owner", status: "active" }, ...(data || []).map((member) => ({ userId: member.user_id, role: membershipRoleToProductRole(member.role), status: "active" }))] });
  }
  if (!tripId) {
    const { data, error } = await context.client.from("trips").select("id, payload");
    if (error) return Response.json({ error: error.message }, { status: 502 });
    const trips = (data || []).flatMap((row): TripLibraryItem[] => {
      const payload = row.payload;
      const details = isStoredTrip(payload) ? (payload as { details?: unknown }).details : undefined;
      if (!details || typeof details !== "object") return [];
      const { title, startDate, endDate, status } = details as Record<string, unknown>;
      return typeof title === "string" && typeof startDate === "string" && typeof endDate === "string" && (status === "筹备中" || status === "进行中" || status === "已结束")
        ? [{ id: row.id, title, startDate, endDate, status }]
        : [];
    }).sort((first, second) => first.id.localeCompare(second.id));
    return Response.json({ trips });
  }
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
  const body = await request.json().catch(() => null) as { action?: string; token?: string; userId?: string; role?: string } | null;
  if (body?.action === "accept" && typeof body.token === "string" && INVITE_TOKEN_PATTERN.test(body.token)) {
    const { data, error } = await context.client.rpc("accept_trip_invite", { invite_token: body.token });
    return error ? Response.json({ error: error.message }, { status: 400 }) : Response.json({ tripId: data });
  }
  if (body?.action === "create-invite") {
    const tripId = getTripId(request);
    if (!tripId) return invalidTripId();
    const { data: trip, error: ownerError } = await context.client.from("trips").select("owner_id").eq("id", tripId).maybeSingle();
    if (ownerError) return Response.json({ error: ownerError.message }, { status: 502 });
    if (!trip || trip.owner_id !== context.userId) return Response.json({ error: "只有行程所有者可以邀请成员。" }, { status: 403 });
    const role = body.role === "companion" ? "viewer" : "editor";
    const token = crypto.randomUUID();
    const { error } = await context.client.from("trip_invites").insert({ token, trip_id: tripId, role, created_by: context.userId, created_at: Date.now(), expires_at: Date.now() + INVITE_TTL_MS });
    return error ? Response.json({ error: error.message }, { status: 403 }) : Response.json({ token });
  }
  if ((body?.action === "update-member" || body?.action === "remove-member") && typeof body.userId === "string") {
    const tripId = getTripId(request);
    if (!tripId) return invalidTripId();
    const { data: trip, error: ownerError } = await context.client.from("trips").select("owner_id").eq("id", tripId).maybeSingle();
    if (ownerError) return Response.json({ error: ownerError.message }, { status: 502 });
    if (!trip || trip.owner_id !== context.userId || body.userId === context.userId) return Response.json({ error: "只有行程所有者可以管理其他成员。" }, { status: 403 });
    if (body.action === "remove-member") {
      const { error } = await context.client.from("trip_members").delete().eq("trip_id", tripId).eq("user_id", body.userId);
      return error ? Response.json({ error: error.message }, { status: 502 }) : Response.json({ removed: true });
    }
    if (body.role !== "collaborator" && body.role !== "companion") return Response.json({ error: "成员角色无效。" }, { status: 400 });
    const { error } = await context.client.from("trip_members").update({ role: productRoleToMembershipRole(body.role) }).eq("trip_id", tripId).eq("user_id", body.userId);
    return error ? Response.json({ error: error.message }, { status: 502 }) : Response.json({ updated: true });
  }
  return Response.json({ error: "邀请请求无效。" }, { status: 400 });
}

export async function DELETE(request: Request) {
  const context = await requireSupabaseUser(request, "请先登录后访问共享行程。");
  if ("error" in context) return context.error;
  const tripId = getTripId(request);
  if (!tripId) return invalidTripId();
  // Keep the owner-only RLS policy authoritative. Selecting the deleted row also
  // prevents a denied RLS delete from being reported as a successful no-op.
  const { data, error } = await context.client.from("trips").delete().eq("id", tripId).select("id").maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 502 });
  if (!data) return Response.json({ error: "只有行程所有者可以删除整个共享行程。" }, { status: 403 });
  return Response.json({ deleted: true });
}
