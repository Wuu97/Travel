export const CONTEXT_BUDGETS = {
  simple: { maxContextTokens: 4_000, maxOutputTokens: 1_200, maxMemoryTokens: 500, maxToolResultTokens: 1_000 },
  guide: { maxContextTokens: 4_000, maxOutputTokens: 2_400, maxMemoryTokens: 500, maxToolResultTokens: 1_000 },
  shortTrip: { maxContextTokens: 6_000, maxOutputTokens: 3_200, maxMemoryTokens: 750, maxToolResultTokens: 2_000 },
  longTrip: { maxContextTokens: 8_000, maxOutputTokens: 4_000, maxMemoryTokens: 1_000, maxToolResultTokens: 3_000 },
} as const;

export const MAX_PROMPT_PLACES = 10;
export const MAX_PROMPT_RESTAURANTS = 10;
