import { normalizeTravelImages } from "../../normalization";
import type { TravelImage } from "../../types";

type WikimediaPage = { title?: unknown; imageinfo?: Array<{ thumburl?: unknown; descriptionurl?: unknown; mime?: unknown; mediatype?: unknown }> };

function isStaticImage(page: WikimediaPage, info: NonNullable<WikimediaPage["imageinfo"]>[number]): boolean {
  const title = typeof page.title === "string" ? page.title : "";
  const mime = typeof info.mime === "string" ? info.mime.toLowerCase() : "";
  const mediaType = typeof info.mediatype === "string" ? info.mediatype.toUpperCase() : "";
  return mediaType === "BITMAP" && /\.(jpe?g|png|webp)$/i.test(title) && /image\/(jpeg|png|webp)/.test(mime);
}

export function mapWikimediaPages(pages: unknown, limit = 3): TravelImage[] {
  const candidates = Object.values(pages && typeof pages === "object" ? pages as Record<string, WikimediaPage> : {}).flatMap((page) => {
    const info = page.imageinfo?.[0];
    return info && isStaticImage(page, info) ? [{ url: info.thumburl, sourceUrl: info.descriptionurl, alt: page.title }] : [];
  });
  return normalizeTravelImages(candidates, { source: "search", provider: "wikimedia", limit }) ?? [];
}
