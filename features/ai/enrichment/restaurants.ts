import type { RichRestaurant } from "../../chat/model";
import type { ItineraryItem } from "../../trip/model";
import type { TravelRestaurant } from "../tools/types";

export type RestaurantRecommendationMeta = {
  description?: string;
  itineraryItem?: ItineraryItem;
};

const text = (value: string | undefined) => value?.trim() || undefined;
const openingHours = (values: string[] | undefined) => values?.map((value) => value.trim()).filter(Boolean).join(" · ") || undefined;

function averagePrice(restaurant: TravelRestaurant): string | undefined {
  if (Number.isFinite(restaurant.averagePrice)) return `¥${restaurant.averagePrice}/人`;
  return text(restaurant.priceText);
}

export function travelRestaurantToRichRestaurant(restaurant: TravelRestaurant, meta: RestaurantRecommendationMeta = {}): RichRestaurant | null {
  const name = text(restaurant.name);
  if (!name) return null;
  return {
    name,
    ...(restaurant.cuisine?.map((item) => item.trim()).filter(Boolean).join(" · ") ? { cuisine: restaurant.cuisine.map((item) => item.trim()).filter(Boolean).join(" · ") } : {}),
    ...(text(restaurant.area) ? { area: text(restaurant.area) } : {}),
    ...(Number.isFinite(restaurant.rating) ? { rating: restaurant.rating } : {}),
    ...(Number.isFinite(restaurant.reviewCount) ? { reviewCount: String(restaurant.reviewCount) } : {}),
    ...(averagePrice(restaurant) ? { averagePrice: averagePrice(restaurant) } : {}),
    ...(openingHours(restaurant.openingHours) ? { openingHours: openingHours(restaurant.openingHours) } : {}),
    ...(restaurant.recommendedDishes?.length ? { recommendedDishes: restaurant.recommendedDishes } : {}),
    ...(restaurant.images?.length ? { images: restaurant.images, imageUrl: restaurant.images[0].url } : {}),
    ...(text(meta.description) ? { description: text(meta.description) } : {}),
    ...(meta.itineraryItem ? { itineraryItem: meta.itineraryItem } : {}),
  };
}
