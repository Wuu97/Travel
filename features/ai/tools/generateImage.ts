import { generateAndStoreImage, type GenerateAndStoreImageDependencies } from "../image/generation/service";
import type { GeneratedTravelImage } from "../image/generation/types";
import type { GenerateImageRequest } from "../schemas/imageRequests";

/** A standalone generative action, intentionally separate from travel data requests. */
export function executeGenerateImage(request: GenerateImageRequest, dependencies: GenerateAndStoreImageDependencies): Promise<GeneratedTravelImage> {
  return generateAndStoreImage(request, dependencies);
}
