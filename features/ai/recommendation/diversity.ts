export type ScoredRecommendation<T> = { item: T; index: number; score: number; reasons: string[] };

const MAX_DIVERSITY_SCORE_GAP = 1;

/**
 * Makes adjacent recommendations less homogeneous without displacing a clearly
 * stronger result. The caller supplies already deterministically sorted items.
 */
export function diversifyRecommendations<T>(
  recommendations: ScoredRecommendation<T>[],
  groupFor: (item: T) => string | undefined,
): ScoredRecommendation<T>[] {
  const result = [...recommendations];
  for (let index = 1; index < result.length; index += 1) {
    const previousGroup = groupFor(result[index - 1].item);
    const currentGroup = groupFor(result[index].item);
    if (!previousGroup || !currentGroup || previousGroup !== currentGroup) continue;
    const alternativeIndex = result.findIndex((candidate, candidateIndex) =>
      candidateIndex > index
      && groupFor(candidate.item)
      && groupFor(candidate.item) !== previousGroup
      && candidate.score >= result[index].score - MAX_DIVERSITY_SCORE_GAP,
    );
    if (alternativeIndex > index) [result[index], result[alternativeIndex]] = [result[alternativeIndex], result[index]];
  }
  return result;
}
