import type { StoredTrip } from "./model";

type TripApiResponse = { trip: StoredTrip | null; version?: number };

const tripUrl = (tripId: string) => `/api/trips?tripId=${encodeURIComponent(tripId)}`;
const authHeaders = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

export async function loadSharedTrip(tripId: string, accessToken: string): Promise<TripApiResponse> {
  const response = await fetch(tripUrl(tripId), { headers: authHeaders(accessToken) });
  if (!response.ok) throw new Error("无法读取共享行程。");
  return (await response.json()) as TripApiResponse;
}

export async function saveSharedTrip(tripId: string, trip: StoredTrip, version: number | undefined, accessToken: string) {
  const response = await fetch(tripUrl(tripId), {
    method: "PUT",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ trip, version }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "无法保存共享行程。");
  return data as { version: number };
}

export async function createTripInvite(tripId: string, accessToken: string) {
  const response = await fetch(tripUrl(tripId), { method: "POST", headers: { ...authHeaders(accessToken), "Content-Type": "application/json" }, body: JSON.stringify({ action: "create-invite" }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.token !== "string") throw new Error(data.error || "无法创建邀请链接。");
  return data.token;
}

export async function acceptTripInvite(token: string, accessToken: string) {
  const response = await fetch("/api/trips", { method: "POST", headers: { ...authHeaders(accessToken), "Content-Type": "application/json" }, body: JSON.stringify({ action: "accept", token }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.tripId !== "string") throw new Error(data.error || "无法加入该行程。");
  return data.tripId as string;
}

export async function deleteSharedTrip(tripId: string, accessToken: string) {
  const response = await fetch(tripUrl(tripId), { method: "DELETE", headers: authHeaders(accessToken) });
  if (!response.ok) throw new Error("无法删除共享行程。");
}
