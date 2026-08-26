/** Returns concise, user-facing reasons derived only from matched ranking rules. */
export function buildRecommendationReasons(reasons: string[]): string[] {
  return [...new Set(reasons.map((reason) => reason.trim()).filter(Boolean))]
    .filter((reason) => !reason.startsWith("降低"))
    .slice(0, 2);
}
