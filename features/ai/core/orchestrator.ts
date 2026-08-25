import { requestLlmCompletion, type LlmMessage } from "./client";
import { parseAiReply } from "./parser";
import { TRAVEL_SYSTEM_PROMPT } from "./prompt";
import type { AiReply } from "../schemas/response";

export type AiRequest = {
  message: string;
  context?: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
};

export async function requestTravelAdvice({ context, history, message }: AiRequest): Promise<AiReply> {
  const messages: LlmMessage[] = [
    { role: "system", content: TRAVEL_SYSTEM_PROMPT },
    ...(context ? [{ role: "system" as const, content: `仅在问题与当前行程相关时参考：${context}` }] : []),
    ...history,
    { role: "user", content: message },
  ];
  return parseAiReply(await requestLlmCompletion(messages));
}
