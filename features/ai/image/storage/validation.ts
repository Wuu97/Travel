import type { GeneratedImageContentType, StoreGeneratedImageInput } from "./types";

export const MAX_GENERATED_IMAGE_BYTES = 10 * 1024 * 1024;

const extensions: Record<GeneratedImageContentType, ".png" | ".jpg" | ".webp"> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
};

export function isGeneratedImageContentType(value: unknown): value is GeneratedImageContentType {
  return typeof value === "string" && value in extensions;
}

export function generatedImageExtension(contentType: GeneratedImageContentType): ".png" | ".jpg" | ".webp" {
  return extensions[contentType];
}

/** Rejects unsafe or oversized binary payloads before a storage provider receives them. */
export function assertValidGeneratedImageInput(input: unknown): asserts input is StoreGeneratedImageInput {
  if (!input || typeof input !== "object") throw new Error("生成图片存储输入无效。");
  const { bytes, contentType } = input as { bytes?: unknown; contentType?: unknown };
  if (!(bytes instanceof Uint8Array)) throw new Error("生成图片必须使用 Uint8Array 字节数据。");
  if (!bytes.length) throw new Error("生成图片不能为空。");
  if (bytes.length > MAX_GENERATED_IMAGE_BYTES) throw new Error("生成图片超过 10MB 限制。");
  if (!isGeneratedImageContentType(contentType)) throw new Error("生成图片格式不受支持。");
}
