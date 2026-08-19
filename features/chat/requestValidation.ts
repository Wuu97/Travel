import { isRecord, isShortString } from "../shared/validation";

type ChatMessage = { role: "user" | "assistant"; content: string };

export type AiRequest = { message: string; context?: string; history: ChatMessage[] };

export function parseAiRequest(value: unknown): AiRequest | null {
  if (!isRecord(value) || !isShortString(value.message) || !value.message.trim()) return null;
  if (value.context !== undefined && !isShortString(value.context, 6_000)) return null;
  if (value.history !== undefined && !Array.isArray(value.history)) return null;
  const history = value.history ?? [];
  if (history.length > 8 || !history.every((message) => isRecord(message) && (message.role === "user" || message.role === "assistant") && isShortString(message.content, 4_000))) return null;
  return { message: value.message.trim(), context: value.context, history: history as ChatMessage[] };
}
