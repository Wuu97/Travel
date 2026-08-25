import { normalizeRichContent, type RichPlace, type RichRestaurant, type RichRoute } from "../../chat/model";
import { createAmapProviders } from "../providers/amap";
import type { PlaceProvider, RestaurantProvider, RouteProvider } from "../providers/types";
import type { AiReply } from "../schemas/response";
import { searchTravelPlaces } from "../tools/places";
import { searchTravelRestaurants } from "../tools/restaurants";
import type { TravelPlace, TravelRouteMode } from "../tools/types";
import { travelPlaceToRichPlace } from "./places";
import { travelRestaurantToRichRestaurant } from "./restaurants";
import { travelRouteToRichRoute } from "./routes";

const PLACE_LIMIT = 5;
const RESTAURANT_LIMIT = 5;
const ROUTE_LIMIT = 3;

type EnrichmentProviders = { amapPlaceProvider: PlaceProvider; amapRestaurantProvider: RestaurantProvider; amapRouteProvider: RouteProvider };

const normalizeName = (value: string) => value.trim().toLowerCase().replace(/[\s()（）]/g, "");
const routeModes: Record<string, TravelRouteMode> = { driving: "driving", "驾车": "driving", walking: "walking", "步行": "walking", transit: "transit", "公共交通": "transit", cycling: "cycling", "骑行": "cycling" };

function findBestTravelMatch<T extends { name: string }>(query: string, candidates: T[]): T | undefined {
  const normalizedQuery = normalizeName(query);
  return candidates.find((candidate) => normalizeName(candidate.name) === normalizedQuery)
    ?? candidates.find((candidate) => {
      const normalizedCandidate = normalizeName(candidate.name);
      return normalizedCandidate.includes(normalizedQuery) || normalizedQuery.includes(normalizedCandidate);
    })
    ?? candidates[0];
}

function placeLookupCache(provider: PlaceProvider) {
  const cache = new Map<string, Promise<TravelPlace[]>>();
  return (query: string, region?: string) => {
    const key = `${normalizeName(query)}|${normalizeName(region ?? "")}`;
    let result = cache.get(key);
    if (!result) {
      result = searchTravelPlaces(provider, { query, ...(region ? { region } : {}), limit: PLACE_LIMIT });
      cache.set(key, result);
    }
    return result;
  };
}

async function enrichPlace(candidate: RichPlace, lookup: ReturnType<typeof placeLookupCache>): Promise<RichPlace> {
  try {
    const matched = findBestTravelMatch(candidate.name, await lookup(candidate.name, candidate.area));
    return matched ? travelPlaceToRichPlace(matched, { description: candidate.description, recommendedDuration: candidate.recommendedDuration, itineraryItem: candidate.itineraryItem }) ?? candidate : candidate;
  } catch {
    return candidate;
  }
}

async function enrichRestaurant(candidate: RichRestaurant, provider: RestaurantProvider): Promise<RichRestaurant> {
  try {
    const matches = await searchTravelRestaurants(provider, { query: candidate.name, area: candidate.area, cuisine: candidate.cuisine, limit: RESTAURANT_LIMIT });
    const matched = findBestTravelMatch(candidate.name, matches);
    if (!matched) return candidate;
    const enriched = travelRestaurantToRichRestaurant(matched, { description: candidate.description, itineraryItem: candidate.itineraryItem });
    return enriched ? { ...enriched, ...(candidate.recommendedDishes?.length ? { recommendedDishes: candidate.recommendedDishes } : {}) } : candidate;
  } catch {
    return candidate;
  }
}

async function enrichRoute(candidate: RichRoute, lookup: ReturnType<typeof placeLookupCache>, provider: RouteProvider): Promise<RichRoute> {
  if (!candidate.from || !candidate.to) return candidate;
  try {
    const [fromMatches, toMatches] = await Promise.all([lookup(candidate.from), lookup(candidate.to)]);
    const from = findBestTravelMatch(candidate.from, fromMatches);
    const to = findBestTravelMatch(candidate.to, toMatches);
    if (!from || !to) return candidate;
    const route = await provider.getRoute({ from, to, mode: routeModes[candidate.mode ?? ""] ?? "driving" });
    const enriched = route ? travelRouteToRichRoute(route, { itineraryItem: candidate.itineraryItem }) : null;
    return enriched ? { ...enriched, ...(candidate.description ? { description: candidate.description } : {}) } : candidate;
  } catch {
    return candidate;
  }
}

function resolveProviders(): EnrichmentProviders | null {
  try { return createAmapProviders(); }
  catch { return null; }
}

export async function enrichAiReply(reply: AiReply, providers: EnrichmentProviders | null = resolveProviders()): Promise<AiReply> {
  const original = normalizeRichContent(reply.richContent);
  if (!original || !providers) return reply;
  const lookup = placeLookupCache(providers.amapPlaceProvider);
  const [places, restaurants, routes] = await Promise.all([
    original.places ? Promise.all(original.places.slice(0, PLACE_LIMIT).map((candidate) => enrichPlace(candidate, lookup))) : undefined,
    original.restaurants ? Promise.all(original.restaurants.slice(0, RESTAURANT_LIMIT).map((candidate) => enrichRestaurant(candidate, providers.amapRestaurantProvider))) : undefined,
    original.routes ? Promise.all(original.routes.slice(0, ROUTE_LIMIT).map((candidate) => enrichRoute(candidate, lookup, providers.amapRouteProvider))) : undefined,
  ]);
  return {
    ...reply,
    richContent: normalizeRichContent({
      ...original,
      ...(original.places ? { places: [...(places ?? []), ...original.places.slice(PLACE_LIMIT)] } : {}),
      ...(original.restaurants ? { restaurants: [...(restaurants ?? []), ...original.restaurants.slice(RESTAURANT_LIMIT)] } : {}),
      ...(original.routes ? { routes: [...(routes ?? []), ...original.routes.slice(ROUTE_LIMIT)] } : {}),
    }),
  };
}
