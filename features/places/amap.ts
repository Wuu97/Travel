import type { PlaceInfo } from "../trip/model";
import type { PlaceCategory, PlaceLookupResult, PlaceProvider } from "./model";

type AmapBusiness = { business_time?: unknown; cost?: unknown; rating?: unknown };
type AmapPoi = { business?: AmapBusiness; business_time?: unknown; cost?: unknown; rating?: unknown; type?: string; typecode?: string };
type AmapResponse = { status?: string; pois?: AmapPoi[] };

const typeCodeCategories: Record<string, PlaceCategory> = {
  "05": "餐饮",
  "06": "购物",
  "08": "活动",
  "10": "住宿",
  "11": "景点",
  "15": "交通",
};
const PLACE_LOOKUP_TIMEOUT_MS = 2_500;

function mapAmapPoi(poi: AmapPoi): PlaceCategory | null {
  const typeCodeCategory = poi.typecode ? typeCodeCategories[poi.typecode.slice(0, 2)] : undefined;
  if (typeCodeCategory) return typeCodeCategory;

  const type = poi.type || "";
  if (/餐饮|咖啡|茶饮|美食/.test(type)) return "餐饮";
  if (/购物|商场|市场/.test(type)) return "购物";
  if (/酒店|住宿|旅馆/.test(type)) return "住宿";
  if (/风景|景点|博物馆|公园/.test(type)) return "景点";
  if (/交通|车站|机场|地铁/.test(type)) return "交通";
  if (/娱乐|文化|体育|演出/.test(type)) return "活动";
  return null;
}

function toFiniteNumber(value: unknown, minimum: number, maximum: number): number | undefined {
  const numeric = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(numeric) && numeric >= minimum && numeric <= maximum ? numeric : undefined;
}

function mapAmapBusiness(poi: AmapPoi): PlaceInfo | undefined {
  const business = poi.business || poi;
  const rating = toFiniteNumber(business.rating, 0, 5);
  const averageCost = toFiniteNumber(business.cost, 0, 1_000_000);
  const openingHours = typeof business.business_time === "string" && business.business_time.trim() ? business.business_time.trim().slice(0, 200) : undefined;
  return rating === undefined && averageCost === undefined && !openingHours ? undefined : { provider: "amap", ...(rating === undefined ? {} : { rating }), ...(averageCost === undefined ? {} : { averageCost }), ...(openingHours ? { openingHours } : {}) };
}

export class AmapPlaceProvider implements PlaceProvider {
  private readonly apiKey: string;
  private readonly fetcher: typeof fetch;

  constructor(apiKey: string, fetcher: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.fetcher = fetcher;
  }

  async lookup(query: string, city?: string): Promise<PlaceLookupResult | null> {
    const params = new URLSearchParams({ key: this.apiKey, keywords: query, show_fields: "business" });
    if (city) params.set("city", city);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PLACE_LOOKUP_TIMEOUT_MS);
    try {
      const response = await this.fetcher(`https://restapi.amap.com/v5/place/text?${params}`, { signal: controller.signal });
      if (!response.ok) return null;

      const data = await response.json() as AmapResponse;
      if (data.status !== "1") return null;
      const poi = data.pois?.find((candidate) => mapAmapPoi(candidate) !== null);
      const category = poi ? mapAmapPoi(poi) : null;
      return category ? { category, confidence: "high", provider: "amap", place: mapAmapBusiness(poi!) } : null;
    } finally {
      clearTimeout(timeout);
    }
  }
}
