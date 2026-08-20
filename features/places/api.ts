import type { PlaceLookupResult } from "./model";

type PlaceLookupResponse = { result?: PlaceLookupResult | null };

export async function lookupPlaceCategory(query: string, city?: string): Promise<PlaceLookupResult | null> {
  const params = new URLSearchParams({ q: query });
  if (city) params.set("city", city);

  try {
    const response = await fetch(`/api/places?${params}`);
    if (!response.ok) return null;
    const data = await response.json() as PlaceLookupResponse;
    return data.result ?? null;
  } catch {
    return null;
  }
}
