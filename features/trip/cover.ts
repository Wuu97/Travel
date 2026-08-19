const MAX_COVER_SIZE = 2 * 1024 * 1024;

export function readTripCover(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/") || file.size > MAX_COVER_SIZE)
    return Promise.resolve(undefined);

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}
