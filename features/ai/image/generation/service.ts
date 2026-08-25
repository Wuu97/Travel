import { randomUUID } from "node:crypto";
import type { GeneratedImageStorageProvider } from "../storage/types";
import { assertValidGeneratedImageInput } from "../storage/validation";
import type { GeneratedTravelImage, GenerateImageInput, ImageGenerationProvider } from "./types";
import { validateGenerateImageInput } from "./validation";

export type GenerateAndStoreImageDependencies = {
  generationProvider: ImageGenerationProvider;
  storageProvider: GeneratedImageStorageProvider;
};

export async function generateAndStoreImage(input: GenerateImageInput, dependencies: GenerateAndStoreImageDependencies): Promise<GeneratedTravelImage> {
  const normalized = validateGenerateImageInput(input);
  const binary = await dependencies.generationProvider.generateImage(normalized);
  assertValidGeneratedImageInput(binary);
  const stored = await dependencies.storageProvider.storeImage(binary);
  return { id: `generated-image-${randomUUID()}`, type: "generated_image", url: stored.url, ...(stored.storageKey ? { storageKey: stored.storageKey } : {}), prompt: normalized.prompt, contentType: binary.contentType, ...(normalized.aspectRatio ? { aspectRatio: normalized.aspectRatio } : {}) };
}
