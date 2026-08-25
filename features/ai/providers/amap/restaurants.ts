import type { RestaurantProvider } from "../types";
import type { RestaurantSearchInput, TravelRestaurant } from "../../tools/types";
import { AmapClient } from "./client";
import { mapAmapPoiToTravelRestaurant } from "./mapper";
import type { AmapPoiResponse } from "./types";

const RESTAURANT_TYPE = "050000";
const POI_SHOW_FIELDS = "business,photos,navi";

export class AmapRestaurantProvider implements RestaurantProvider {
  constructor(private readonly client: AmapClient) {}

  async searchRestaurants(input: RestaurantSearchInput): Promise<TravelRestaurant[]> {
    const hasCoordinates = Number.isFinite(input.latitude) && Number.isFinite(input.longitude);
    const keywords = [input.area, input.query, input.cuisine].filter((value): value is string => Boolean(value?.trim())).join(" ");
    const data = await this.client.request<AmapPoiResponse>(hasCoordinates ? "/v5/place/around" : "/v5/place/text", hasCoordinates
      ? { location: `${input.longitude},${input.latitude}`, radius: Math.min(50_000, Math.max(0, input.radiusMeters ?? 3_000)), keywords: keywords || undefined, types: RESTAURANT_TYPE, page_size: Math.min(25, Math.max(1, input.limit ?? 5)), page_num: 1, show_fields: POI_SHOW_FIELDS }
      : { keywords, types: RESTAURANT_TYPE, region: input.city, city_limit: input.city ? "true" : undefined, page_size: Math.min(25, Math.max(1, input.limit ?? 5)), page_num: 1, show_fields: POI_SHOW_FIELDS });
    return (data.pois ?? []).flatMap((poi) => {
      const restaurant = mapAmapPoiToTravelRestaurant(poi);
      return restaurant ? [restaurant] : [];
    });
  }

  async getRestaurantDetails(id: string): Promise<TravelRestaurant | null> {
    const data = await this.client.request<AmapPoiResponse>("/v5/place/detail", { id, show_fields: POI_SHOW_FIELDS });
    return data.pois?.length ? mapAmapPoiToTravelRestaurant(data.pois[0]) : null;
  }
}
