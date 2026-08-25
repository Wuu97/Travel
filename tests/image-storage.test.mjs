import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const storageSources = ["features/ai/image/storage/types.ts", "features/ai/image/storage/validation.ts"];

test("stores generated image bytes locally behind safe UUID references", async () => {
  const compilation = await compileTypeScript([...storageSources, "features/ai/image/storage/local/provider.ts"], "travel-image-storage-build-");
  const root = join(await mkdtemp(join(tmpdir(), "travel-generated-images-")), "nested", "images");
  try {
    const { LocalGeneratedImageStorageProvider } = await compilation.importModule("local/provider.js");
    const provider = new LocalGeneratedImageStorageProvider({ rootDirectory: root, publicBasePath: "/generated-images/" });
    for (const [contentType, extension] of [["image/png", ".png"], ["image/jpeg", ".jpg"], ["image/webp", ".webp"]]) {
      const bytes = new Uint8Array([1, 2, 3]);
      const stored = await provider.storeImage({ bytes, contentType });
      assert.match(stored.url, new RegExp(`^/generated-images/[0-9a-f-]{36}\\${extension}$`));
      assert.equal(stored.storageKey, stored.url.slice(1));
      assert.ok(!stored.url.includes("/tmp/") && !stored.storageKey.includes("/tmp/"));
      assert.deepEqual(new Uint8Array(await readFile(join(root, stored.url.split("/").at(-1)))), bytes);
      assert.deepEqual(Object.keys(stored).sort(), ["storageKey", "url"]);
    }
    assert.equal((await readdir(root)).length, 3);
    await assert.rejects(() => provider.storeImage({ bytes: new Uint8Array(), contentType: "image/png" }));
    await assert.rejects(() => provider.storeImage({ bytes: new Uint8Array(10 * 1024 * 1024 + 1), contentType: "image/png" }));
    await assert.rejects(() => provider.storeImage({ bytes: new Uint8Array([1]), contentType: "image/gif" }));
    assert.throws(() => new LocalGeneratedImageStorageProvider({ rootDirectory: "" }));
  } finally {
    await compilation.cleanup();
    await rm(root.split("/nested/")[0], { recursive: true, force: true });
  }
});

test("validates generated image storage inputs without accepting base64 payloads", async () => {
  const compilation = await compileTypeScript(storageSources, "travel-image-storage-");
  try {
    const { MAX_GENERATED_IMAGE_BYTES, assertValidGeneratedImageInput, generatedImageExtension } = await compilation.importModule("validation.js");
    for (const contentType of ["image/png", "image/jpeg", "image/webp"]) assert.doesNotThrow(() => assertValidGeneratedImageInput({ bytes: new Uint8Array([1]), contentType }));
    assert.throws(() => assertValidGeneratedImageInput({ bytes: new Uint8Array(), contentType: "image/png" }));
    assert.throws(() => assertValidGeneratedImageInput({ bytes: new Uint8Array(MAX_GENERATED_IMAGE_BYTES + 1), contentType: "image/png" }));
    assert.throws(() => assertValidGeneratedImageInput({ bytes: new Uint8Array([1]), contentType: "image/gif" }));
    assert.throws(() => assertValidGeneratedImageInput({ bytes: "base64-data", contentType: "image/png" }));
    assert.equal(generatedImageExtension("image/png"), ".png");
    assert.equal(generatedImageExtension("image/jpeg"), ".jpg");
    assert.equal(generatedImageExtension("image/webp"), ".webp");
  } finally { await compilation.cleanup(); }
});
