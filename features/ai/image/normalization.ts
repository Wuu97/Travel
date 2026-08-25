import type { TravelImage } from "./types";

export const MAX_ENTITY_IMAGES = 5;
export type TravelImageNormalizationOptions = { source?: TravelImage["source"]; provider?: string; limit?: number };

export function normalizeImageUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const url = value.trim();
  if (!url) return undefined;
  try {
    const protocol = new URL(url).protocol;
    return protocol === "http:" || protocol === "https:" ? url : undefined;
  } catch {
    return undefined;
  }
}

/** Validates, de-duplicates, and bounds trusted image results without changing their order. */
export function normalizeTravelImages(values: Array<{ url?: unknown; alt?: unknown; sourceUrl?: unknown }> | undefined, options: TravelImageNormalizationOptions = {}): TravelImage[] | undefined {
  if (!values?.length) return undefined;
  const seen = new Set<string>();
  const images: TravelImage[] = [];
  for (const value of values) {
    const url = normalizeImageUrl(value?.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    images.push({ url, source: options.source ?? "provider", ...(options.provider ? { provider: options.provider } : {}), ...(typeof value?.alt === "string" && value.alt.trim() ? { alt: value.alt.trim() } : {}), ...(normalizeImageUrl(value?.sourceUrl) ? { sourceUrl: normalizeImageUrl(value?.sourceUrl) } : {}) });
    if (images.length === (options.limit ?? MAX_ENTITY_IMAGES)) break;
  }
  return images.length ? images : undefined;
}
