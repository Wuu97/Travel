import { findBestTravelMatch } from "../enrichment/matching";
import { createAmapProviders } from "../providers/amap";
import type { PlaceProvider, RestaurantProvider, RouteProvider } from "../providers/types";
import type { TravelContext } from "../schemas/context";
import type { AiDataRequest } from "../schemas/dataRequests";
import { searchTravelPlaces } from "./places";
import { searchTravelRestaurants } from "./restaurants";
import type { TravelPlace, TravelRestaurant, TravelRoute } from "./types";

export type ToolExecutorProviders = { amapPlaceProvider: PlaceProvider; amapRestaurantProvider: RestaurantProvider; amapRouteProvider: RouteProvider };
export type ExecutedTravelData = { places: TravelPlace[]; restaurants: TravelRestaurant[]; routes: TravelRoute[] };

function resolveProviders(): ToolExecutorProviders | null {
  try { return createAmapProviders(); }
  catch { return null; }
}

function dedupe<T extends { id?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item, index) => {
    const key = item.id || `${index}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function executeDataRequests(
  requests: AiDataRequest[],
  options: { providers?: ToolExecutorProviders | null; travelContext?: TravelContext } = {},
): Promise<ExecutedTravelData> {
  const providers = options.providers === undefined ? resolveProviders() : options.providers;
  if (!providers || !requests.length) return { places: [], restaurants: [], routes: [] };
  const context = options.travelContext;
  const placeCache = new Map<string, Promise<TravelPlace[]>>();
  const lookupPlace = (query: string, city?: string, area?: string) => {
    const key = `${query.trim().toLowerCase()}|${city ?? ""}|${area ?? ""}`;
    let result = placeCache.get(key);
    if (!result) {
      result = searchTravelPlaces(providers.amapPlaceProvider, { query, city, region: area, limit: 5 });
      placeCache.set(key, result);
    }
    return result;
  };
  const results = await Promise.all(requests.map(async (request) => {
    try {
      if (request.type === "place_search") {
        return { places: await lookupPlace(request.query, request.city ?? context?.city, request.area ?? context?.region).then((items) => items.slice(0, request.limit)) };
      }
      if (request.type === "place_lookup") {
        const candidates = await lookupPlace(request.query, request.city ?? context?.city, request.area ?? context?.region);
        const match = findBestTravelMatch(request.query, candidates);
        return match ? { places: [match] } : {};
      }
      if (request.type === "restaurant_search") {
        const restaurants = await searchTravelRestaurants(providers.amapRestaurantProvider, {
          query: request.query, city: request.city ?? context?.city, area: request.area, cuisine: request.cuisine, limit: request.limit,
        });
        return { restaurants };
      }
      const city = context?.city;
      const [fromCandidates, toCandidates] = await Promise.all([lookupPlace(request.from, city), lookupPlace(request.to, city)]);
      const from = findBestTravelMatch(request.from, fromCandidates);
      const to = findBestTravelMatch(request.to, toCandidates);
      if (!from || !to) return {};
      const route = await providers.amapRouteProvider.getRoute({ from, to, mode: request.mode ?? "driving" });
      return route ? { routes: [route] } : {};
    } catch { return {}; }
  }));
  return {
    places: dedupe(results.flatMap((result) => result.places ?? [])),
    restaurants: dedupe(results.flatMap((result) => result.restaurants ?? [])),
    routes: results.flatMap((result) => result.routes ?? []).filter((route, index, all) => all.findIndex((candidate) => `${candidate.from.name}|${candidate.to.name}|${candidate.mode ?? ""}` === `${route.from.name}|${route.to.name}|${route.mode ?? ""}`) === index),
  };
}
