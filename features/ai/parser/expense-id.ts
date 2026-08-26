/** Produces a content-stable ID so an AI suggestion survives repeated parsing. */
export function stableExpenseSuggestionId({ amount, category, id, index, relatedItineraryItemId, relatedItineraryTitle, title }: {
  amount: number;
  category: string;
  id?: string;
  index: number;
  relatedItineraryItemId?: string;
  relatedItineraryTitle?: string;
  title: string;
}) {
  const supplied = id?.trim();
  if (supplied) return supplied;
  const source = [title.trim().toLocaleLowerCase(), category, Math.round(amount * 100) / 100, relatedItineraryItemId?.trim() || relatedItineraryTitle?.trim() || ""].join("|");
  let hash = 2166136261;
  for (const character of source || String(index)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `ai-expense-${(hash >>> 0).toString(36)}`;
}
