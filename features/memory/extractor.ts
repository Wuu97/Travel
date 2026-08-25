import { requestLlmCompletion, type LlmMessage } from "../ai/core/client";
import { normalizeTravelPreference, type TravelPreference } from "./model";
import { TRAVEL_MEMORY_EXTRACTION_PROMPT } from "./prompts";

export type CandidateMemory = {
  preference: TravelPreference;
  confidence: number;
  source: "explicit" | "inferred";
};

export type MemoryExtractionInput = {
  userMessage: string;
  assistantMessage?: string;
};

export type MemoryExtractionCompletion = (messages: LlmMessage[]) => Promise<string>;

function parseCandidates(content: string): CandidateMemory[] {
  const normalized = content.trim().replace(/^```(?:json)?\s*|\s*```$/gi, "");
  try {
    const payload = JSON.parse(normalized) as { memories?: unknown };
    if (!Array.isArray(payload.memories)) return [];
    return payload.memories.slice(0, 5).flatMap((value): CandidateMemory[] => {
      if (!value || typeof value !== "object" || Array.isArray(value)) return [];
      const raw = value as Record<string, unknown>;
      const preference = normalizeTravelPreference(raw.preference);
      return preference && Object.values(preference).some((item) => item !== undefined) && raw.confidence === 1 && raw.source === "explicit"
        ? [{ preference, confidence: 1, source: "explicit" }]
        : [];
    });
  } catch {
    return [];
  }
}

/** Extracts explicit long-term preferences only; callers decide whether and when to persist candidates. */
export async function extractMemoryCandidates(
  input: MemoryExtractionInput,
  complete: MemoryExtractionCompletion = requestLlmCompletion,
): Promise<CandidateMemory[]> {
  const userMessage = input.userMessage.trim();
  if (!userMessage || userMessage.length > 4_000) return [];
  const messages: LlmMessage[] = [
    { role: "system", content: TRAVEL_MEMORY_EXTRACTION_PROMPT },
    { role: "user", content: JSON.stringify({ userMessage }) },
  ];
  return parseCandidates(await complete(messages));
}
