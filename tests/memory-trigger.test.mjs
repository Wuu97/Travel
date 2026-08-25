import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

test("triggers only for likely explicit travel preferences", async () => {
  const compilation = await compileTypeScript(["features/memory/trigger.ts"], "travel-memory-trigger-");
  try {
    const { shouldExtractMemory } = await compilation.importModule("trigger.js");
    assert.equal(shouldExtractMemory("我喜欢自然风景"), true);
    assert.equal(shouldExtractMemory("我不喜欢购物景点"), true);
    assert.equal(shouldExtractMemory("我通常喜欢慢节奏旅行"), true);
    assert.equal(shouldExtractMemory("我喜欢自驾"), true);
    assert.equal(shouldExtractMemory("成都有什么景点"), false);
    assert.equal(shouldExtractMemory("帮我规划云南10天路线"), false);
    assert.equal(shouldExtractMemory("这次带父母去云南"), false);
    assert.equal(shouldExtractMemory("   "), false);
  } finally { await compilation.cleanup(); }
});
