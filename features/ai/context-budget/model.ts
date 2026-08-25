export type ContextBudget = {
  maxContextTokens: number;
  maxOutputTokens: number;
  maxMemoryTokens: number;
  maxToolResultTokens: number;
};

export type ContextBudgetInput = {
  query: string;
  tripDays?: number;
  complexity?: "simple" | "guide" | "shortTrip" | "longTrip";
  requiresTools?: boolean;
};
