import type { TripLibraryItem } from "./model";

/** Resolves library state without making navigation a side effect of hydration. */
export function selectTripFromLibrary(items: TripLibraryItem[], requestedTripId: string | null) {
  const selectedTripId = requestedTripId && items.some((item) => item.id === requestedTripId)
    ? requestedTripId
    : items[0]?.id || null;
  return { selectedTripId };
}
