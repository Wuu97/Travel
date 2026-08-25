import type { GeneratedImageAspectRatio } from "../image/generation/types";
import { validateGenerateImageInput } from "../image/generation/validation";

export type GenerateImageRequest = {
  type: "generate_image";
  prompt: string;
  aspectRatio?: GeneratedImageAspectRatio;
};

export function parseGenerateImageRequest(value: unknown): GenerateImageRequest | null {
  if (!value || typeof value !== "object" || (value as { type?: unknown }).type !== "generate_image") return null;
  try { return { type: "generate_image", ...validateGenerateImageInput(value) }; }
  catch { return null; }
}
