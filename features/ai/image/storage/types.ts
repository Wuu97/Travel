export type GeneratedImageContentType = "image/png" | "image/jpeg" | "image/webp";

export type StoreGeneratedImageInput = {
  bytes: Uint8Array;
  contentType: GeneratedImageContentType;
};

export type StoredGeneratedImage = {
  url: string;
  storageKey?: string;
};

export interface GeneratedImageStorageProvider {
  storeImage(input: StoreGeneratedImageInput): Promise<StoredGeneratedImage>;
}
