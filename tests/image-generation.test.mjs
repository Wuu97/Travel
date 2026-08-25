import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const generationSources = ["features/ai/image/storage/types.ts", "features/ai/image/storage/validation.ts", "features/ai/image/generation/types.ts", "features/ai/image/generation/validation.ts", "features/ai/image/generation/service.ts", "features/ai/schemas/imageRequests.ts", "features/ai/tools/generateImage.ts"];

test("generates and stores provider bytes through the standalone generate_image tool", async () => {
  const compilation = await compileTypeScript(generationSources, "travel-generation-build-");
  try {
    const { parseGenerateImageRequest } = await compilation.importModule("schemas/imageRequests.js");
    const { executeGenerateImage } = await compilation.importModule("tools/generateImage.js");
    const calls = [];
    const storage = { async storeImage(input) { calls.push(input); return { url: "/generated-images/test.png", storageKey: "generated-images/test.png" }; } };
    for (const contentType of ["image/png", "image/jpeg", "image/webp"]) {
      const request = parseGenerateImageRequest({ type: "generate_image", prompt: "  Autumn Kanas Lake  ", aspectRatio: "16:9" });
      assert.ok(request);
      const result = await executeGenerateImage(request, { generationProvider: { async generateImage(input) { assert.deepEqual(input, { prompt: "Autumn Kanas Lake", aspectRatio: "16:9" }); return { bytes: new Uint8Array([1, 2, 3]), contentType }; } }, storageProvider: storage });
      assert.equal(result.type, "generated_image");
      assert.match(result.id, /^generated-image-[0-9a-f-]{36}$/);
      assert.equal(result.url, "/generated-images/test.png");
      assert.equal(result.prompt, "Autumn Kanas Lake");
      assert.equal(result.contentType, contentType);
      assert.equal(result.aspectRatio, "16:9");
    }
    assert.equal(calls.length, 3);
    for (const invalid of [null, { type: "generate_image", prompt: "" }, { type: "generate_image", prompt: "   " }, { type: "generate_image", prompt: "x".repeat(4_001) }, { type: "generate_image", prompt: "x", aspectRatio: "100:1" }]) assert.equal(parseGenerateImageRequest(invalid), null);
    const maximumLengthPrompt = parseGenerateImageRequest({ type: "generate_image", prompt: "x".repeat(4_000) });
    assert.ok(maximumLengthPrompt);
    assert.equal(maximumLengthPrompt.prompt.length, 4_000);
    const valid = parseGenerateImageRequest({ type: "generate_image", prompt: "x" });
    assert.ok(valid);
    await assert.rejects(() => executeGenerateImage(valid, { generationProvider: { async generateImage() { return { bytes: new Uint8Array(), contentType: "image/png" }; } }, storageProvider: storage }));
    await assert.rejects(() => executeGenerateImage(valid, { generationProvider: { async generateImage() { return { bytes: new Uint8Array([1]), contentType: "image/gif" }; } }, storageProvider: storage }));
    await assert.rejects(() => executeGenerateImage(valid, { generationProvider: { async generateImage() { throw new Error("provider failure"); } }, storageProvider: storage }), /provider failure/);
    await assert.rejects(() => executeGenerateImage(valid, { generationProvider: { async generateImage() { return { bytes: new Uint8Array([1]), contentType: "image/png" }; } }, storageProvider: { async storeImage() { throw new Error("storage failure"); } } }), /storage failure/);
  } finally { await compilation.cleanup(); }
});

test("generates, stores, and reads a generated image through the real local storage pipeline", async () => {
  const compilation = await compileTypeScript([...generationSources, "features/ai/image/storage/local/provider.ts"], "travel-generation-local-build-");
  const root = await mkdtemp(join(tmpdir(), "travel-generated-image-integration-"));
  try {
    const { parseGenerateImageRequest } = await compilation.importModule("schemas/imageRequests.js");
    const { executeGenerateImage } = await compilation.importModule("tools/generateImage.js");
    const { LocalGeneratedImageStorageProvider } = await compilation.importModule("image/storage/local/provider.js");
    const expectedBytes = new Uint8Array([1, 2, 3, 4, 5]);
    const request = parseGenerateImageRequest({ type: "generate_image", prompt: "  Autumn Kanas Lake  ", aspectRatio: "16:9" });
    assert.ok(request);
    const result = await executeGenerateImage(request, { generationProvider: { async generateImage(input) { assert.deepEqual(input, { prompt: "Autumn Kanas Lake", aspectRatio: "16:9" }); return { bytes: expectedBytes, contentType: "image/png" }; } }, storageProvider: new LocalGeneratedImageStorageProvider({ rootDirectory: root }) });
    assert.equal(result.type, "generated_image");
    assert.match(result.id, /^generated-image-[0-9a-f-]{36}$/);
    assert.match(result.url, /^\/generated-images\/[0-9a-f-]{36}\.png$/);
    assert.equal(result.storageKey, result.url.slice(1));
    assert.equal(result.prompt, "Autumn Kanas Lake");
    assert.equal(result.contentType, "image/png");
    assert.equal(result.aspectRatio, "16:9");
    const filename = result.url.split("/").at(-1);
    assert.ok(filename);
    assert.deepEqual(new Uint8Array(await readFile(join(root, filename))), expectedBytes);
  } finally {
    await compilation.cleanup();
    await rm(root, { recursive: true, force: true });
  }
});
