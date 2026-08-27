export const DEFAULT_TRIP_ID = "hangzhou-summer-trip";

export type TripRequestTarget =
  | { kind: "list" }
  | { kind: "detail"; tripId: string }
  | { kind: "invalid" };

/**
 * Resolves an API request without applying the workspace's presentation
 * fallback. A missing (or whitespace-only) query is explicitly a list request.
 */
export function getTripRequestTarget(request: Request): TripRequestTarget {
  const rawTripId = new URL(request.url).searchParams.get("tripId");
  const tripId = rawTripId?.trim();
  if (!tripId) return { kind: "list" };
  return /^[a-zA-Z0-9_-]{1,128}$/.test(tripId)
    ? { kind: "detail", tripId }
    : { kind: "invalid" };
}

/** Reads and validates the externally visible trip identifier used by shared snapshots. */
export function getTripId(request: Request) {
  const tripId = new URL(request.url).searchParams.get("tripId") || DEFAULT_TRIP_ID;
  return /^[a-zA-Z0-9_-]{1,128}$/.test(tripId) ? tripId : null;
}
