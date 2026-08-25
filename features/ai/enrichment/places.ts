import type { RichPlace } from "../../chat/model";
import type { ItineraryItem } from "../../trip/model";
import type { TravelPlace } from "../tools/types";

export type PlaceRecommendationMeta = {
  description?: string;
  recommendedDuration?: string;
  itineraryItem?: ItineraryItem;
};

const text = (value: string | undefined) => value?.trim() || undefined;
const openingHours = (values: string[] | undefined) => values?.map((value) => value.trim()).filter(Boolean).join(" · ") || undefined;

export function travelPlaceToRichPlace(place: TravelPlace, meta: PlaceRecommendationMeta = {}): RichPlace | null {
  const name = text(place.name);
  if (!name) return null;
  return {
    name,
    ...(text(place.category) ? { category: text(place.category) } : {}),
    ...(text(place.area) ? { area: text(place.area) } : {}),
    ...(Number.isFinite(place.rating) ? { rating: place.rating } : {}),
    ...(Number.isFinite(place.reviewCount) ? { reviewCount: String(place.reviewCount) } : {}),
    ...(text(place.priceText) ? { price: text(place.priceText) } : {}),
    ...(openingHours(place.openingHours) ? { openingHours: openingHours(place.openingHours) } : {}),
    ...(place.images?.length ? { images: place.images, imageUrl: place.images[0].url } : {}),
    ...(text(meta.description) ? { description: text(meta.description) } : {}),
    ...(text(meta.recommendedDuration) ? { recommendedDuration: text(meta.recommendedDuration) } : {}),
    ...(meta.itineraryItem ? { itineraryItem: meta.itineraryItem } : {}),
  };
}
