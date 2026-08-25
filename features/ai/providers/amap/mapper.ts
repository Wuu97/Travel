import { normalizeTravelImages } from "../../image/normalization";
import type { TravelImage, TravelPlace, TravelRestaurant } from "../../tools/types";
import type { AmapPoi } from "./types";

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseLocation(value: unknown): Partial<Pick<TravelPlace, "latitude" | "longitude">> {
  const [longitude, latitude] = (text(value) ?? "").split(",").map((coordinate) => finiteNumber(coordinate));
  return longitude === undefined || latitude === undefined ? {} : { longitude, latitude };
}

function openingHours(poi: AmapPoi): string[] | undefined {
  const values = [text(poi.business?.opentime_today), text(poi.business?.opentime_week)].filter((value): value is string => Boolean(value));
  return values.length ? values : undefined;
}

function images(poi: AmapPoi): TravelImage[] | undefined {
  return normalizeTravelImages((Array.isArray(poi.photos) ? poi.photos : []).map((photo) => ({ url: photo?.url, alt: photo?.title })), { provider: "amap" });
}

function commonPoiFields(poi: AmapPoi) {
  const id = text(poi.id);
  const name = text(poi.name);
  if (!id || !name) return null;
  const cost = text(poi.business?.cost);
  return {
    id, name,
    ...(text(poi.type) ? { category: text(poi.type) } : {}),
    ...(text(poi.address) ? { address: text(poi.address) } : {}),
    ...(text(poi.adname) ? { area: text(poi.adname) } : {}),
    ...parseLocation(poi.location),
    ...(finiteNumber(poi.business?.rating) !== undefined ? { rating: finiteNumber(poi.business?.rating) } : {}),
    ...(openingHours(poi) ? { openingHours: openingHours(poi) } : {}),
    ...(text(poi.business?.tel) ?? text(poi.tel) ? { phone: text(poi.business?.tel) ?? text(poi.tel) } : {}),
    ...(images(poi) ? { images: images(poi) } : {}),
    source: { provider: "amap", externalId: id },
    cost,
  };
}

export function mapAmapPoiToTravelPlace(poi: AmapPoi): TravelPlace | null {
  const fields = commonPoiFields(poi);
  if (!fields) return null;
  const { cost, ...place } = fields;
  return { ...place, ...(cost ? { priceText: cost } : {}) };
}

export function mapAmapPoiToTravelRestaurant(poi: AmapPoi): TravelRestaurant | null {
  const fields = commonPoiFields(poi);
  if (!fields) return null;
  const { cost, ...restaurant } = fields;
  const averagePrice = finiteNumber(cost);
  return { ...restaurant, ...(averagePrice === undefined && cost ? { priceText: cost } : {}), ...(averagePrice === undefined ? {} : { averagePrice }) };
}
