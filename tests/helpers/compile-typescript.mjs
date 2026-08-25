import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const projectRoot = new URL("../../", import.meta.url);

export const aiTestSources = [
  "features/ai/image/generation/types.ts", "features/ai/image/generation/validation.ts", "features/ai/image/generation/service.ts", "features/ai/schemas/imageRequests.ts", "features/ai/tools/generateImage.ts",
  "features/ai/image/storage/types.ts", "features/ai/image/storage/validation.ts", "features/ai/image/storage/local/provider.ts",
  "features/ai/image/types.ts", "features/ai/image/normalization.ts", "features/ai/image/enrichPlaceImages.ts", "features/ai/image/enrichExecutedTravelImages.ts", "features/ai/image/providers/types.ts", "features/ai/image/providers/wikimedia/mapper.ts", "features/ai/image/providers/wikimedia/provider.ts",
  "features/ai/core/client.ts", "features/ai/core/parser.ts", "features/ai/core/toolResultReasoning.ts", "features/ai/enrichment/matching.ts", "features/ai/enrichment/places.ts", "features/ai/enrichment/restaurants.ts", "features/ai/enrichment/routes.ts", "features/ai/enrichment/richContent.ts",
  "features/ai/providers/amap/client.ts", "features/ai/providers/amap/index.ts", "features/ai/providers/amap/mapper.ts", "features/ai/providers/amap/places.ts", "features/ai/providers/amap/restaurants.ts", "features/ai/providers/amap/routes.ts", "features/ai/providers/amap/types.ts", "features/ai/providers/types.ts",
  "features/ai/tools/executor.ts", "features/ai/tools/places.ts", "features/ai/tools/restaurants.ts", "features/ai/tools/routes.ts", "features/ai/tools/types.ts", "features/ai/schemas/context.ts", "features/ai/schemas/dataRequests.ts", "features/ai/schemas/response.ts", "features/chat/model.ts", "features/chat/requestValidation.ts", "features/shared/validation.ts", "features/trip/model.ts",
];

export async function compileTypeScript(sources, prefix = "travel-test-build-") {
  const output = await mkdtemp(join(tmpdir(), prefix));
  try {
    await execFileAsync(join(process.cwd(), "node_modules/.bin/tsc"), ["--target", "ES2022", "--module", "commonjs", "--moduleResolution", "node", "--skipLibCheck", "--outDir", output, ...sources], { cwd: projectRoot });
  } catch (error) {
    await rm(output, { recursive: true, force: true });
    throw error;
  }
  return {
    importModule: (relativePath) => import(new URL(`file://${join(output, relativePath)}`).href),
    cleanup: () => rm(output, { recursive: true, force: true }),
  };
}
