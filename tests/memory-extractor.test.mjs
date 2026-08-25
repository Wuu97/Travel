import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const sources = ["features/ai/core/client.ts", "features/memory/model.ts", "features/memory/prompts.ts", "features/memory/extractor.ts"];

async function extractorWith(response) {
  const compilation = await compileTypeScript(sources, "travel-memory-extractor-");
  const { extractMemoryCandidates } = await compilation.importModule("memory/extractor.js");
  return { compilation, extract: (input) => extractMemoryCandidates(input, async () => response) };
}

test("extracts only explicit long-term interests and dislikes", async () => {
  const { compilation, extract } = await extractorWith('{"memories":[{"preference":{"interests":["nature"],"dislikes":["shopping"]},"confidence":1,"source":"explicit"}]}');
  try {
    assert.deepEqual(await extract({ userMessage: "我喜欢自然风景，不喜欢购物。" }), [{ preference: { pace: undefined, transportPreference: undefined, budgetLevel: undefined, interests: ["nature"], dislikes: ["shopping"] }, confidence: 1, source: "explicit" }]);
  } finally { await compilation.cleanup(); }
});

test("does not infer a memory from a single-trip request or an ordinary planning request", async () => {
  const { compilation, extract } = await extractorWith('{"memories":[]}');
  try {
    assert.deepEqual(await extract({ userMessage: "这次带父母去云南，希望轻松一点。" }), []);
    assert.deepEqual(await extract({ userMessage: "帮我规划成都三天行程。" }), []);
  } finally { await compilation.cleanup(); }
});

test("accepts explicit transport preference and rejects inferred candidates", async () => {
  const { compilation, extract } = await extractorWith('{"memories":[{"preference":{"transportPreference":"self_drive"},"confidence":1,"source":"explicit"},{"preference":{"pace":"relaxed"},"confidence":0.6,"source":"inferred"}]}');
  try {
    assert.deepEqual(await extract({ userMessage: "我喜欢自驾旅行。" }), [{ preference: { pace: undefined, transportPreference: "self_drive", budgetLevel: undefined }, confidence: 1, source: "explicit" }]);
  } finally { await compilation.cleanup(); }
});
