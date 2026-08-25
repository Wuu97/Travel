import type { TravelContext } from "../schemas/context";
import type { ExecutedTravelData } from "../tools/executor";
import { enrichPlaceImages } from "./enrichPlaceImages";
import type { ImageSearchProvider } from "./providers/types";

const PLACE_IMAGE_ENRICHMENT_LIMIT = 5;

/** Enriches only provider-backed tool places; restaurants and routes remain untouched. */
export async function enrichExecutedTravelImages(data: ExecutedTravelData, provider: ImageSearchProvider, context?: TravelContext): Promise<ExecutedTravelData> {
  const enriched = await Promise.all(data.places.slice(0, PLACE_IMAGE_ENRICHMENT_LIMIT).map((place) => enrichPlaceImages(place, provider, context)));
  const places = [...enriched, ...data.places.slice(PLACE_IMAGE_ENRICHMENT_LIMIT)];
  return { ...data, places };
}
