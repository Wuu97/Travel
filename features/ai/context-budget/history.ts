import type { LlmMessage } from "../core/client";
import { estimateTokenCount, trimTextToTokenBudget } from "./manager";

const messageTokens = (message: LlmMessage) => estimateTokenCount(message.content);

/** Retains system instructions and the newest conversation turns that fit the supplied budget. */
export function trimHistoryByBudget(messages: LlmMessage[], maxTokens: number): LlmMessage[] {
  const systemMessages = messages.filter((message) => message.role === "system");
  const retained: LlmMessage[] = [];
  let remaining = Math.max(0, maxTokens - systemMessages.reduce((total, message) => total + messageTokens(message), 0));

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role === "system") continue;
    const tokens = messageTokens(message);
    if (tokens > remaining) {
      if (!retained.length && remaining > 0) retained.unshift({ ...message, content: trimTextToTokenBudget(message.content, remaining) });
      break;
    }
    retained.unshift(message);
    remaining -= tokens;
  }

  return [...systemMessages, ...retained];
}
