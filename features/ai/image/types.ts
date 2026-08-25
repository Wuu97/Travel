/** A real travel image supplied by a verified provider or a trusted image search. */
export type TravelImage = {
  url: string;
  source: "provider" | "search";
  provider?: string;
  alt?: string;
  sourceUrl?: string;
};
