import { estimateTokenCount, trimTextToTokenBudget } from "./manager";

/** Keeps the leading, priority-ordered context sections when a final text block exceeds its allowance. */
export function limitContextText(text: string, maxTokens: number): string {
  return estimateTokenCount(text) <= maxTokens ? text : trimTextToTokenBudget(text, maxTokens);
}
