import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const sources = [
  "features/ai/core/answerBudget.ts",
  "features/ai/schemas/context.ts",
  "features/ai/tools/types.ts",
  "features/ai/tools/executor.ts",
  "features/memory/model.ts",
  "features/memory/context.ts",
  "features/memory/retrieval.ts",
  "features/ai/context-budget/constants.ts",
  "features/ai/context-budget/model.ts",
  "features/ai/context-budget/manager.ts",
  "features/ai/context-budget/index.ts",
  "features/ai/context-builder.ts",
];

const memory = (preference, index) => ({ id: `${index}`.padStart(8, "0") + "-2222-4222-8222-222222222222", userId: "11111111-1111-4111-8111-111111111111", preference, confidence: 1, source: "explicit", createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z" });

test("reuses answer-depth budgets for simple and long travel questions", async () => {
  const compilation = await compileTypeScript(sources, "travel-context-budget-");
  try {
    const { resolveContextBudget } = await compilation.importModule("ai/context-budget/manager.js");
    assert.equal(resolveContextBudget({ query: "西湖门票多少钱" }).maxOutputTokens, 2400);
    assert.equal(resolveContextBudget({ query: "新疆15天自驾攻略" }).maxOutputTokens, 4000);
  } finally { await compilation.cleanup(); }
});

test("bounds memory text by deterministic preference priority", async () => {
  const compilation = await compileTypeScript(sources, "travel-memory-budget-");
  try {
    const { estimateTokenCount, trimMemoryContext } = await compilation.importModule("ai/context-budget/manager.js");
    const text = trimMemoryContext([memory({ pace: "relaxed", transportPreference: "self_drive", dislikes: ["shopping"], interests: Array.from({ length: 20 }, () => "nature") }, 1)], 18);
    assert.ok(estimateTokenCount(text) <= 18);
    assert.match(text, /偏轻松/);
  } finally { await compilation.cleanup(); }
});

test("limits POI and restaurant prompt facts while retaining route facts", async () => {
  const compilation = await compileTypeScript(sources, "travel-tool-budget-");
  try {
    const { trimToolResults } = await compilation.importModule("ai/context-budget/manager.js");
    const data = { places: Array.from({ length: 50 }, (_, index) => ({ id: `p${index}`, name: `景点${index}` })), restaurants: Array.from({ length: 50 }, (_, index) => ({ id: `r${index}`, name: `餐厅${index}` })), routes: [{ from: { name: "A" }, to: { name: "B" }, distanceMeters: 500 }] };
    const result = trimToolResults(data, 1_000);
    assert.ok(result.places.length <= 10);
    assert.ok(result.restaurants.length <= 10);
    assert.equal(result.routes.length, 1);
  } finally { await compilation.cleanup(); }
});

test("keeps budgeted context within the configured total", async () => {
  const compilation = await compileTypeScript(sources, "travel-total-context-budget-");
  try {
    const { buildBudgetedAiContext } = await compilation.importModule("ai/context-builder.js");
    const { estimateTokenCount, resolveContextBudget } = await compilation.importModule("ai/context-budget/manager.js");
    const budget = resolveContextBudget({ query: "帮我规划新疆15天自驾攻略" });
    const context = buildBudgetedAiContext({ userQuery: "帮我规划新疆15天自驾攻略", travelContext: { destination: "新疆".repeat(100), trip: { days: 15 } }, memories: [memory({ pace: "relaxed", interests: Array.from({ length: 20 }, () => "nature") }, 1)], budget });
    assert.ok(estimateTokenCount(context.combinedContext) <= budget.maxContextTokens);
  } finally { await compilation.cleanup(); }
});
