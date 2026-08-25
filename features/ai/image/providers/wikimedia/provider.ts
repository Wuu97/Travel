import { mapWikimediaPages } from "./mapper";
import type { ImageSearchInput, ImageSearchProvider } from "../types";
import type { TravelImage } from "../../types";

const API_URL = "https://commons.wikimedia.org/w/api.php";
const TIMEOUT_MS = 8_000;

export class WikimediaImageSearchProvider implements ImageSearchProvider {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async searchImages({ query, limit = 3 }: ImageSearchInput): Promise<TravelImage[]> {
    if (!query.trim()) return [];
    const params = new URLSearchParams({ action: "query", format: "json", generator: "search", gsrsearch: query.trim(), gsrnamespace: "6", gsrlimit: String(Math.min(Math.max(limit, 1), 3)), prop: "imageinfo", iiprop: "url|mime|mediatype", iiurlwidth: "1200" });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await this.fetcher(`${API_URL}?${params}`, { signal: controller.signal, headers: { "User-Agent": "TravelApp/1.0" } });
      if (!response.ok) return [];
      const data = await response.json() as { query?: { pages?: unknown } };
      return mapWikimediaPages(data.query?.pages, limit);
    } catch {
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}
