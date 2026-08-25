import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const sources = ["features/ai/schemas/context.ts", "features/memory/model.ts", "features/memory/context.ts", "features/memory/retrieval.ts", "features/ai/context-builder.ts"];
const memory = (preference) => ({ id: "22222222-2222-4222-8222-222222222222", userId: "11111111-1111-4111-8111-111111111111", preference, confidence: 1, source: "explicit", createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" });

test("combines relevant memory with current trip context", async () => {
  const compilation = await compileTypeScript(sources, "travel-ai-context-");
  try {
    const { buildAiContext } = await compilation.importModule("ai/context-builder.js");
    const context = buildAiContext({ userQuery: "规划新疆10天自然路线", travelContext: { destination: "新疆", trip: { days: 10 } }, memories: [memory({ pace: "relaxed", interests: ["nature"] })] });
    assert.match(context.combinedContext, /新疆/);
    assert.match(context.memoryContextText, /偏轻松/);
    assert.match(context.memoryContextText, /自然风景/);
  } finally { await compilation.cleanup(); }
});

test("keeps anonymous and failed memory loading non-blocking", async () => {
  const compilation = await compileTypeScript(sources, "travel-ai-context-loader-");
  try {
    const { buildAiContextWithMemoryLoader } = await compilation.importModule("ai/context-builder.js");
    let called = false;
    const anonymous = await buildAiContextWithMemoryLoader({ userQuery: "成都怎么玩" });
    assert.equal(anonymous.memoryContextText, "");
    const failed = await buildAiContextWithMemoryLoader({ userQuery: "成都怎么玩", loadMemories: async () => { called = true; throw new Error("database unavailable"); } });
    assert.equal(called, true);
    assert.equal(failed.memoryContextText, "");
  } finally { await compilation.cleanup(); }
});

test("lets an explicit shopping request override a shopping dislike", async () => {
  const compilation = await compileTypeScript(sources, "travel-ai-context-shopping-");
  try {
    const { buildAiContext } = await compilation.importModule("ai/context-builder.js");
    const context = buildAiContext({ userQuery: "上海购物攻略", memories: [memory({ dislikes: ["shopping"] })] });
    assert.equal(context.memoryContextText, "");
  } finally { await compilation.cleanup(); }
});
