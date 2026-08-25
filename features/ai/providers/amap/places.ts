import type { PlaceProvider } from "../types";
import type { PlaceSearchInput, TravelPlace } from "../../tools/types";
import { AmapClient } from "./client";
import { mapAmapPoiToTravelPlace } from "./mapper";
import type { AmapPoiResponse } from "./types";

const POI_SHOW_FIELDS = "business,photos,navi";

export class AmapPlaceProvider implements PlaceProvider {
  constructor(private readonly client: AmapClient) {}

  async searchPlaces(input: PlaceSearchInput): Promise<TravelPlace[]> {
    const data = await this.client.request<AmapPoiResponse>("/v5/place/text", {
      keywords: input.query, region: input.region ?? input.city, city_limit: input.city || input.region ? "true" : undefined,
      page_size: Math.min(25, Math.max(1, input.limit ?? 5)), page_num: 1, show_fields: POI_SHOW_FIELDS,
    });
    return (data.pois ?? []).flatMap((poi) => {
      const place = mapAmapPoiToTravelPlace(poi);
      return place ? [place] : [];
    });
  }

  async getPlaceDetails(id: string): Promise<TravelPlace | null> {
    const data = await this.client.request<AmapPoiResponse>("/v5/place/detail", { id, show_fields: POI_SHOW_FIELDS });
    return data.pois?.length ? mapAmapPoiToTravelPlace(data.pois[0]) : null;
  }
}
