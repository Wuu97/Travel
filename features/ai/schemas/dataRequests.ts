import type { TravelRouteMode } from "../tools/types";

export type PlaceLookupRequest = { type: "place_lookup"; query: string; city?: string; area?: string };
export type PlaceSearchRequest = { type: "place_search"; query: string; city?: string; area?: string; limit: number };
export type RestaurantSearchRequest = { type: "restaurant_search"; query?: string; city?: string; area?: string; cuisine?: string; limit: number };
export type RouteDataRequest = { type: "route"; from: string; to: string; mode?: TravelRouteMode };
export type AiDataRequest = PlaceLookupRequest | PlaceSearchRequest | RestaurantSearchRequest | RouteDataRequest;

const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
const limit = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.min(5, Math.max(1, Math.floor(value))) : 3;
const routeMode = (value: unknown): TravelRouteMode | undefined => value === "driving" || value === "walking" || value === "transit" || value === "cycling" ? value : undefined;

export function parseDataRequests(value: unknown): AiDataRequest[] {
  if (!Array.isArray(value)) return [];
  const result: AiDataRequest[] = [];
  const counts = { place_lookup: 0, place_search: 0, restaurant_search: 0, route: 0 };
  for (const item of value) {
    if (!item || typeof item !== "object" || result.length >= 8) continue;
    const raw = item as Record<string, unknown>;
    if (raw.type === "place_lookup") {
      const query = text(raw.query);
      if (query && counts.place_lookup < 4) { result.push({ type: "place_lookup", query, city: text(raw.city), area: text(raw.area) }); counts.place_lookup += 1; }
    } else if (raw.type === "place_search") {
      const query = text(raw.query);
      if (query && counts.place_search < 3) { result.push({ type: "place_search", query, city: text(raw.city), area: text(raw.area), limit: limit(raw.limit) }); counts.place_search += 1; }
    } else if (raw.type === "restaurant_search") {
      const query = text(raw.query), cuisine = text(raw.cuisine), area = text(raw.area);
      if ((query || cuisine || area) && counts.restaurant_search < 3) { result.push({ type: "restaurant_search", query, city: text(raw.city), area, cuisine, limit: limit(raw.limit) }); counts.restaurant_search += 1; }
    } else if (raw.type === "route") {
      const from = text(raw.from), to = text(raw.to), mode = routeMode(raw.mode);
      if (from && to && counts.route < 2 && (raw.mode === undefined || mode)) { result.push({ type: "route", from, to, ...(mode ? { mode } : {}) }); counts.route += 1; }
    }
  }
  return result;
}
