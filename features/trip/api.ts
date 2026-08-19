import type { StoredTrip } from "./model";

type TripApiResponse = { trip: StoredTrip | null };

const tripUrl = (tripId: string) => `/api/trips?tripId=${encodeURIComponent(tripId)}`;

export async function loadSharedTrip(tripId: string): Promise<StoredTrip | null> {
  const response = await fetch(tripUrl(tripId));
  if (!response.ok) throw new Error("无法读取共享行程。");
  return ((await response.json()) as TripApiResponse).trip;
}

export async function saveSharedTrip(tripId: string, trip: StoredTrip) {
  const response = await fetch(tripUrl(tripId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trip }),
  });
  if (!response.ok) throw new Error("无法保存共享行程。");
}

export async function deleteSharedTrip(tripId: string) {
  const response = await fetch(tripUrl(tripId), { method: "DELETE" });
  if (!response.ok) throw new Error("无法删除共享行程。");
}
