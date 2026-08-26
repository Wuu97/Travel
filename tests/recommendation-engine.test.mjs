import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const sources = ["features/ai/schemas/context.ts", "features/memory/model.ts", "features/ai/recommendation/model.ts", "features/ai/recommendation/context.ts", "features/ai/recommendation/place-ranking.ts", "features/ai/recommendation/restaurant-ranking.ts", "features/ai/recommendation/index.ts"];

test("ranks items that match nature interests above neutral items", async () => {
  const compilation = await compileTypeScript(sources, "travel-recommendation-nature-");
  try {
    const { rankPlaces } = await compilation.importModule("ai/recommendation/place-ranking.js");
    const result = rankPlaces({ items: [{ id: "mall", name: "购物中心", category: "购物" }, { id: "lake", name: "西湖", category: "自然景观" }], memoryContext: { preferences: { interests: ["nature"] } } });
    assert.equal(result.sortedItems[0]?.id, "lake");
    assert.match(result.scores[0]?.reasons.join(" ") ?? "", /自然风景/);
  } finally { await compilation.cleanup(); }
});

test("lowers shopping items without deleting them and supports relaxed pace", async () => {
  const compilation = await compileTypeScript(sources, "travel-recommendation-pace-");
  try {
    const { rankPlaces } = await compilation.importModule("ai/recommendation/place-ranking.js");
    const result = rankPlaces({ items: [{ id: "mall", name: "商业街", category: "购物" }, { id: "park", name: "湖滨公园", category: "自然" }], memoryContext: { preferences: { dislikes: ["shopping"], pace: "relaxed" } } });
    assert.deepEqual(result.sortedItems.map((item) => item.id), ["park", "mall"]);
    assert.equal(result.sortedItems.length, 2);
  } finally { await compilation.cleanup(); }
});

test("keeps provider order unchanged without memory preferences", async () => {
  const compilation = await compileTypeScript(sources, "travel-recommendation-empty-");
  try {
    const { rankPlaces } = await compilation.importModule("ai/recommendation/place-ranking.js");
    const items = [{ id: "first", name: "甲" }, { id: "second", name: "乙" }];
    assert.deepEqual(rankPlaces({ items }).sortedItems, items);
  } finally { await compilation.cleanup(); }
});
