import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { GeneratedImageStorageProvider, StoreGeneratedImageInput, StoredGeneratedImage } from "../types";
import { assertValidGeneratedImageInput, generatedImageExtension } from "../validation";

export type LocalGeneratedImageStorageOptions = {
  rootDirectory: string;
  publicBasePath?: string;
};

function normalizePublicBasePath(value: string | undefined): string {
  const path = (value ?? "/generated-images").trim().replace(/\/+$/, "") || "/";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || path.split("/").some((part) => part === "..")) throw new Error("本地图片 publicBasePath 必须是安全的同源路径。");
  return path;
}

/** A Node filesystem storage provider for local development or single-instance deployments. */
export class LocalGeneratedImageStorageProvider implements GeneratedImageStorageProvider {
  private readonly publicBasePath: string;

  constructor(private readonly options: LocalGeneratedImageStorageOptions) {
    if (!options.rootDirectory?.trim()) throw new Error("本地图片 rootDirectory 不能为空。");
    this.publicBasePath = normalizePublicBasePath(options.publicBasePath);
  }

  async storeImage(input: StoreGeneratedImageInput): Promise<StoredGeneratedImage> {
    assertValidGeneratedImageInput(input);
    const filename = `${randomUUID()}${generatedImageExtension(input.contentType)}`;
    await mkdir(this.options.rootDirectory, { recursive: true });
    await writeFile(join(this.options.rootDirectory, filename), input.bytes);
    const relativePath = `${this.publicBasePath === "/" ? "" : this.publicBasePath}/${filename}`;
    return { url: relativePath, storageKey: relativePath.slice(1) };
  }
}
