export const DEFAULT_TRIP_ID = "hangzhou-summer-trip";

/** Reads and validates the externally visible trip identifier used by shared snapshots. */
export function getTripId(request: Request) {
  const tripId = new URL(request.url).searchParams.get("tripId") || DEFAULT_TRIP_ID;
  return /^[a-zA-Z0-9_-]{1,128}$/.test(tripId) ? tripId : null;
}
