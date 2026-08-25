const MIN_CONTAINS_MATCH_LENGTH = 3;
const MIN_CONTAINS_MATCH_RATIO = 0.35;

export const normalizeName = (value: string) => value.trim().toLowerCase().replace(/[\s()（）]/g, "");
export const extractBaseEntityName = (value: string) => normalizeName(value.replace(/[（(][^（）()]*[）)]/g, ""));

function isStrongContainsMatch(left: string, right: string): boolean {
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length > right.length ? left : right;
  return shorter.length >= MIN_CONTAINS_MATCH_LENGTH && longer.includes(shorter) && shorter.length / longer.length >= MIN_CONTAINS_MATCH_RATIO;
}

export function findBestTravelMatch<T extends { name: string }>(query: string, candidates: T[]): T | undefined {
  const normalizedQuery = normalizeName(query);
  const baseQuery = extractBaseEntityName(query);
  if (!normalizedQuery) return undefined;
  return candidates.find((candidate) => normalizeName(candidate.name) === normalizedQuery)
    ?? candidates.find((candidate) => baseQuery && extractBaseEntityName(candidate.name) === baseQuery)
    ?? candidates.find((candidate) => {
      const normalizedCandidate = normalizeName(candidate.name);
      return normalizedCandidate && isStrongContainsMatch(normalizedQuery, normalizedCandidate);
    });
}
