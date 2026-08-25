import type { RestaurantProvider } from "../providers/types";
import type { RestaurantSearchInput, TravelRestaurant } from "./types";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

function normalizeLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit!)));
}

function dedupeById(restaurants: TravelRestaurant[]): TravelRestaurant[] {
  return restaurants.filter((restaurant, index) => restaurants.findIndex((candidate) => candidate.id === restaurant.id) === index);
}

export async function searchTravelRestaurants(provider: RestaurantProvider, input: RestaurantSearchInput): Promise<TravelRestaurant[]> {
  const query = input.query?.trim();
  const cuisine = input.cuisine?.trim();
  const area = input.area?.trim();
  if (!query && !cuisine && !area) return [];
  const restaurants = await provider.searchRestaurants({ ...input, ...(query ? { query } : {}), ...(cuisine ? { cuisine } : {}), ...(area ? { area } : {}), limit: normalizeLimit(input.limit) });
  return dedupeById(restaurants);
}

export function getTravelRestaurantDetails(provider: RestaurantProvider, id: string): Promise<TravelRestaurant | null> {
  return provider.getRestaurantDetails(id);
}
