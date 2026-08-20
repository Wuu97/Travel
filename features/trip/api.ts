import type { StoredTrip } from "./model";

type TripApiResponse = { trip: StoredTrip | null };

const tripUrl = (tripId: string) => `/api/trips?tripId=${encodeURIComponent(tripId)}`;
const authHeaders = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });

export async function loadSharedTrip(tripId: string, accessToken: string): Promise<StoredTrip | null> {
  const response = await fetch(tripUrl(tripId), { headers: authHeaders(accessToken) });
  if (!response.ok) throw new Error("无法读取共享行程。");
  return ((await response.json()) as TripApiResponse).trip;
}

export async function saveSharedTrip(tripId: string, trip: StoredTrip, accessToken: string) {
  const response = await fetch(tripUrl(tripId), {
    method: "PUT",
    headers: { ...authHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ trip }),
  });
  if (!response.ok) throw new Error("无法保存共享行程。");
}

export async function deleteSharedTrip(tripId: string, accessToken: string) {
  const response = await fetch(tripUrl(tripId), { method: "DELETE", headers: authHeaders(accessToken) });
  if (!response.ok) throw new Error("无法删除共享行程。");
}
