import type { TravelContext } from "../schemas/context";
import type { TravelPlace } from "../tools/types";
import type { ImageSearchProvider } from "./providers/types";

export function buildPlaceImageQuery(place: TravelPlace, context?: TravelContext): string {
  const name = place.name.trim();
  const city = context?.city?.trim();
  return city && !name.includes(city) ? `${city} ${name}` : name;
}

/** Adds a trusted search image only when the verified POI has no provider image. */
export async function enrichPlaceImages(place: TravelPlace, provider: ImageSearchProvider, context?: TravelContext): Promise<TravelPlace> {
  if (place.images?.length) return place;
  try {
    const images = await provider.searchImages({ query: buildPlaceImageQuery(place, context), limit: 3 });
    return images.length ? { ...place, images } : place;
  } catch {
    return place;
  }
}
