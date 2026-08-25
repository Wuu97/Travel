import type { GeneratedImageContentType } from "../storage/types";

export type GeneratedImageAspectRatio = "1:1" | "16:9" | "9:16" | "4:3" | "3:4";

export type GenerateImageInput = {
  prompt: string;
  aspectRatio?: GeneratedImageAspectRatio;
};

export type GeneratedImageBinary = {
  bytes: Uint8Array;
  contentType: GeneratedImageContentType;
};

export interface ImageGenerationProvider {
  generateImage(input: GenerateImageInput): Promise<GeneratedImageBinary>;
}

export type GeneratedTravelImage = {
  id: string;
  type: "generated_image";
  url: string;
  storageKey?: string;
  prompt: string;
  contentType: GeneratedImageContentType;
  aspectRatio?: GeneratedImageAspectRatio;
};
