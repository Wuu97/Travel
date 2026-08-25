import type { PlaceProvider } from "../providers/types";
import type { PlaceSearchInput, TravelPlace } from "./types";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit!)));
}

function dedupeById(places: TravelPlace[]): TravelPlace[] {
  return places.filter((place, index) => places.findIndex((candidate) => candidate.id === place.id) === index);
}

export async function searchTravelPlaces(provider: PlaceProvider, input: PlaceSearchInput): Promise<TravelPlace[]> {
  const query = input.query.trim();
  if (!query) return [];
  const places = await provider.searchPlaces({ ...input, query, limit: normalizeLimit(input.limit) });
  return dedupeById(places);
}

export function getTravelPlaceDetails(provider: PlaceProvider, id: string): Promise<TravelPlace | null> {
  return provider.getPlaceDetails(id);
}
