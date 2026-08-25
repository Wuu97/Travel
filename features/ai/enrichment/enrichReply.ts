import { normalizeRichContent, type RichPlace, type RichRestaurant, type RichRoute } from "../../chat/model";
import { createAmapProviders } from "../providers/amap";
import type { PlaceProvider, RestaurantProvider, RouteProvider } from "../providers/types";
import type { AiReply } from "../schemas/response";
import type { TravelContext } from "../schemas/context";
import { searchTravelPlaces } from "../tools/places";
import { searchTravelRestaurants } from "../tools/restaurants";
import type { TravelPlace, TravelRouteMode } from "../tools/types";
import { travelPlaceToRichPlace } from "./places";
import { travelRestaurantToRichRestaurant } from "./restaurants";
import { travelRouteToRichRoute } from "./routes";
import { findBestTravelMatch, normalizeName } from "./matching";
import { createCachedImageSearchProvider, enrichPlaceImages } from "../image/enrichPlaceImages";
import { WikimediaImageSearchProvider } from "../image/providers/wikimedia/provider";
import type { ImageSearchProvider } from "../image/providers/types";

const PLACE_LIMIT = 5;
const RESTAURANT_LIMIT = 5;
const ROUTE_LIMIT = 3;

export type EnrichmentProviders = { amapPlaceProvider: PlaceProvider; amapRestaurantProvider: RestaurantProvider; amapRouteProvider: RouteProvider; imageSearchProvider?: ImageSearchProvider };

export { extractBaseEntityName, findBestTravelMatch, normalizeName } from "./matching";
const routeModes: Record<string, TravelRouteMode> = { driving: "driving", "驾车": "driving", walking: "walking", "步行": "walking", transit: "transit", "公共交通": "transit", cycling: "cycling", "骑行": "cycling" };

function placeLookupCache(provider: PlaceProvider, travelContext?: TravelContext) {
  const cache = new Map<string, Promise<TravelPlace[]>>();
  return (query: string, area?: string) => {
    const city = travelContext?.city;
    const region = area || travelContext?.region;
    const key = `${normalizeName(query)}|${normalizeName(city ?? "")}|${normalizeName(region ?? "")}`;
    let result = cache.get(key);
    if (!result) {
      result = searchTravelPlaces(provider, { query, ...(city ? { city } : {}), ...(region ? { region } : {}), limit: PLACE_LIMIT });
      cache.set(key, result);
    }
    return result;
  };
}

async function enrichPlace(candidate: RichPlace, lookup: ReturnType<typeof placeLookupCache>, imageSearchProvider: ImageSearchProvider | undefined, travelContext?: TravelContext, verifiedPlaces: TravelPlace[] = []): Promise<RichPlace> {
  try {
    // Tool results cross this boundary as TravelPlace values, so reuse their safe
    // verification rather than turning them back into an Amap lookup by name.
    const matched = findBestTravelMatch(candidate.name, verifiedPlaces) ?? findBestTravelMatch(candidate.name, await lookup(candidate.name, candidate.area));
    if (!matched) return candidate;
    const withImages = imageSearchProvider ? await enrichPlaceImages(matched, imageSearchProvider, travelContext) : matched;
    return travelPlaceToRichPlace(withImages, { description: candidate.description, recommendedDuration: candidate.recommendedDuration, itineraryItem: candidate.itineraryItem }) ?? candidate;
  } catch {
    return candidate;
  }
}

async function enrichRestaurant(candidate: RichRestaurant, provider: RestaurantProvider, travelContext?: TravelContext): Promise<RichRestaurant> {
  try {
    const matches = await searchTravelRestaurants(provider, { query: candidate.name, city: travelContext?.city, area: candidate.area, cuisine: candidate.cuisine, limit: RESTAURANT_LIMIT });
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
  try { return { ...createAmapProviders(), imageSearchProvider: createCachedImageSearchProvider(new WikimediaImageSearchProvider()) }; }
  catch { return null; }
}

export async function enrichAiReply(reply: AiReply, providers: EnrichmentProviders | null = resolveProviders(), travelContext?: TravelContext, verifiedPlaces: TravelPlace[] = []): Promise<AiReply> {
  const original = normalizeRichContent(reply.richContent);
  if (!original || !providers) return reply;
  const lookup = placeLookupCache(providers.amapPlaceProvider, travelContext);
  const [places, restaurants, routes] = await Promise.all([
    original.places ? Promise.all(original.places.slice(0, PLACE_LIMIT).map((candidate) => enrichPlace(candidate, lookup, providers.imageSearchProvider, travelContext, verifiedPlaces))) : undefined,
    original.restaurants ? Promise.all(original.restaurants.slice(0, RESTAURANT_LIMIT).map((candidate) => enrichRestaurant(candidate, providers.amapRestaurantProvider, travelContext))) : undefined,
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
