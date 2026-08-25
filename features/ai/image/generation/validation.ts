import type { GenerateImageInput, GeneratedImageAspectRatio } from "./types";

export const MAX_IMAGE_PROMPT_LENGTH = 4_000;

const aspectRatios: Record<GeneratedImageAspectRatio, true> = { "1:1": true, "16:9": true, "9:16": true, "4:3": true, "3:4": true };

export function isGeneratedImageAspectRatio(value: unknown): value is GeneratedImageAspectRatio {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(aspectRatios, value);
}

/** Produces a normalized, resource-safe generation input before it reaches a provider. */
export function validateGenerateImageInput(input: unknown): GenerateImageInput {
  if (!input || typeof input !== "object") throw new Error("图片生成输入无效。");
  const raw = input as { prompt?: unknown; aspectRatio?: unknown };
  const prompt = typeof raw.prompt === "string" ? raw.prompt.trim() : "";
  if (!prompt) throw new Error("图片生成提示词不能为空。");
  if (prompt.length > MAX_IMAGE_PROMPT_LENGTH) throw new Error("图片生成提示词超过长度限制。");
  const aspectRatio = raw.aspectRatio;
  if (aspectRatio === undefined) return { prompt };
  if (!isGeneratedImageAspectRatio(aspectRatio)) throw new Error("图片生成比例不受支持。");
  return { prompt, aspectRatio };
}
