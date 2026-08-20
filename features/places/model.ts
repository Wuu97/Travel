import type { ItineraryItem, PlaceInfo } from "../trip/model";

export type PlaceCategory = ItineraryItem["type"];
export type PlaceLookupResult = {
  category: PlaceCategory;
  confidence: "high" | "low";
  provider: "amap";
  place?: PlaceInfo;
};

export interface PlaceProvider {
  lookup(query: string, city?: string): Promise<PlaceLookupResult | null>;
}
