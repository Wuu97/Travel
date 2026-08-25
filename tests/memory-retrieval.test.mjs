import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const sources = ["features/memory/model.ts", "features/memory/context.ts", "features/memory/retrieval.ts", "features/ai/schemas/context.ts"];
const memory = (id, preference, confidence = 1) => ({ id, userId: "11111111-1111-4111-8111-111111111111", preference, confidence, source: "explicit", createdAt: "2026-08-01T00:00:00.000Z", updatedAt: `2026-08-${String(Number(id.slice(0, 2)) || 1).padStart(2, "0")}T00:00:00.000Z` });

test("retrieves only interests relevant to the current request", async () => {
  const compilation = await compileTypeScript(sources, "travel-memory-retrieval-");
  try {
    const { retrieveRelevantMemories } = await compilation.importModule("memory/retrieval.js");
    assert.equal(retrieveRelevantMemories({ memories: [memory("01", { interests: ["nature"] })], query: "推荐自然景点" }).length, 1);
    assert.equal(retrieveRelevantMemories({ memories: [memory("02", { interests: ["photography"] })], query: "酒店价格" }).length, 0);
  } finally { await compilation.cleanup(); }
});

test("keeps planning preferences bounded and respects explicit shopping requests", async () => {
  const compilation = await compileTypeScript(sources, "travel-memory-retrieval-planning-");
  try {
    const { MAX_RELEVANT_MEMORIES, retrieveRelevantMemories } = await compilation.importModule("memory/retrieval.js");
    const shoppingAvoidance = memory("03", { dislikes: ["shopping"] });
    assert.equal(retrieveRelevantMemories({ memories: [shoppingAvoidance], query: "帮我规划旅游路线" }).length, 1);
    assert.equal(retrieveRelevantMemories({ memories: [shoppingAvoidance], query: "推荐购物中心" }).length, 0);
    const many = Array.from({ length: 10 }, (_, index) => memory(String(index + 10), { pace: "relaxed" }, index / 10));
    assert.equal(retrieveRelevantMemories({ memories: many, query: "帮我安排旅行路线" }).length, MAX_RELEVANT_MEMORIES);
  } finally { await compilation.cleanup(); }
});

test("formats selected memories as concise AI-readable context", async () => {
  const compilation = await compileTypeScript(sources, "travel-memory-context-");
  try {
    const { buildMemoryContext } = await compilation.importModule("memory/context.js");
    const formatted = buildMemoryContext([memory("04", { pace: "relaxed", interests: ["nature"] })]);
    assert.match(formatted, /轻松/);
    assert.match(formatted, /自然/);
  } finally { await compilation.cleanup(); }
});
