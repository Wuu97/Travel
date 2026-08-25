import type { TravelImage } from "./types";

export const MAX_ENTITY_IMAGES = 5;

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

/** Validates, de-duplicates, and bounds provider photos without changing their order. */
export function normalizeTravelImages(values: Array<{ url?: unknown; alt?: unknown }> | undefined): TravelImage[] | undefined {
  if (!values?.length) return undefined;
  const seen = new Set<string>();
  const images: TravelImage[] = [];
  for (const value of values) {
    const url = normalizeImageUrl(value?.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    images.push({ url, source: "provider", ...(typeof value?.alt === "string" && value.alt.trim() ? { alt: value.alt.trim() } : {}) });
    if (images.length === MAX_ENTITY_IMAGES) break;
  }
  return images.length ? images : undefined;
}
