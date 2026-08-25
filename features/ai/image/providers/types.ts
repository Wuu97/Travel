import type { TravelImage } from "../types";

export type ImageSearchInput = { query: string; limit?: number };

export interface ImageSearchProvider {
  searchImages(input: ImageSearchInput): Promise<TravelImage[]>;
}
