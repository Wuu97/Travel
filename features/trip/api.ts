import type { StoredTrip, TripLibraryItem } from "./model";
import type { TripMember } from "./members";

type TripApiResponse = { trip: StoredTrip | null; version?: number };

const tripUrl = (tripId: string) => `/api/trips?tripId=${encodeURIComponent(tripId)}`;
const authHeaders = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

export async function loadSharedTrip(tripId: string, accessToken: string): Promise<TripApiResponse> {
  const response = await fetch(tripUrl(tripId), { headers: authHeaders(accessToken) });
  const data = await response.json().catch(() => ({})) as TripApiResponse & { error?: unknown };
  if (!response.ok) {
    const detail = typeof data.error === "string" && data.error.trim() ? data.error.trim() : `请求失败（HTTP ${response.status}）`;
    throw new Error(`无法读取共享行程：${detail}`);
  }
  return data;
}

export async function listAccessibleTrips(accessToken: string): Promise<TripLibraryItem[]> {
  const response = await fetch("/api/trips", { headers: authHeaders(accessToken) });
  const data = await response.json().catch(() => ({})) as { trips?: unknown; error?: unknown };
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "无法读取云端旅行列表。");
  return Array.isArray(data.trips)
    ? data.trips.filter((trip): trip is TripLibraryItem => Boolean(trip && typeof trip === "object" && typeof (trip as TripLibraryItem).id === "string" && typeof (trip as TripLibraryItem).title === "string" && typeof (trip as TripLibraryItem).startDate === "string" && typeof (trip as TripLibraryItem).endDate === "string" && (trip as TripLibraryItem).cloudBacked === true && typeof (trip as TripLibraryItem).canDelete === "boolean" && ["筹备中", "进行中", "已结束"].includes((trip as TripLibraryItem).status || "")))
    : [];
}

export async function saveSharedTrip(tripId: string, trip: StoredTrip, version: number | undefined, accessToken: string, signal?: AbortSignal) {
  const response = await fetch(tripUrl(tripId), {
    method: "PUT",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ trip, version }),
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "无法保存共享行程。");
  return data as { version: number };
}

export async function createTripInvite(tripId: string, accessToken: string, role: "collaborator" | "companion" = "collaborator") {
  const response = await fetch(tripUrl(tripId), { method: "POST", headers: { ...authHeaders(accessToken), "Content-Type": "application/json" }, body: JSON.stringify({ action: "create-invite", role }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.token !== "string") throw new Error(data.error || "无法创建邀请链接。");
  return data.token;
}

export async function listTripMembers(tripId: string, accessToken: string): Promise<{ members: TripMember[]; canManage: boolean; canEdit: boolean; canDelete: boolean }> {
  const response = await fetch(`${tripUrl(tripId)}&action=members`, { headers: authHeaders(accessToken) });
  const data = await response.json().catch(() => ({})) as { members?: unknown; canManage?: unknown; canEdit?: unknown; canDelete?: unknown; error?: unknown };
  if (!response.ok || !Array.isArray(data.members)) throw new Error(typeof data.error === "string" ? data.error : "无法读取成员列表。");
  return { canDelete: data.canDelete === true, canEdit: data.canEdit === true, canManage: data.canManage === true, members: data.members.filter((member): member is TripMember => Boolean(member && typeof member === "object" && typeof (member as TripMember).userId === "string" && ["owner", "collaborator", "companion"].includes((member as TripMember).role))) };
}

export async function updateTripMemberRole(tripId: string, userId: string, role: "collaborator" | "companion", accessToken: string) {
  const response = await fetch(tripUrl(tripId), { method: "POST", headers: { ...authHeaders(accessToken), "Content-Type": "application/json" }, body: JSON.stringify({ action: "update-member", userId, role }) });
  const data = await response.json().catch(() => ({})) as { error?: unknown };
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "无法更新成员角色。");
}

export async function removeTripMember(tripId: string, userId: string, accessToken: string) {
  const response = await fetch(tripUrl(tripId), { method: "POST", headers: { ...authHeaders(accessToken), "Content-Type": "application/json" }, body: JSON.stringify({ action: "remove-member", userId }) });
  const data = await response.json().catch(() => ({})) as { error?: unknown };
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "无法移除成员。");
}

export async function acceptTripInvite(token: string, accessToken: string) {
  const response = await fetch("/api/trips", { method: "POST", headers: { ...authHeaders(accessToken), "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept", token }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.tripId !== "string") throw new Error(data.error || "无法加入该行程。");
  return data.tripId as string;
}

export async function deleteSharedTrip(tripId: string, accessToken: string) {
  const response = await fetch(tripUrl(tripId), { method: "DELETE", headers: authHeaders(accessToken) });
  const data = await response.json().catch(() => ({})) as { error?: unknown };
  if (!response.ok) throw new Error(typeof data.error === "string" && data.error.trim() ? data.error : "无法删除云端行程，请重试。");
}
