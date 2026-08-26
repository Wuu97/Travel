import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const sources = ["features/memory/model.ts", "features/ai/schemas/context.ts", "features/ai/recommendation/model.ts", "features/ai/recommendation/place-ranking.ts", "features/ai/recommendation/restaurant-ranking.ts"];

test("nature preferences rank places but do not affect restaurants", async () => {
  const compilation = await compileTypeScript(sources, "travel-recommendation-domain-");
  try {
    const { rankPlaces } = await compilation.importModule("ai/recommendation/place-ranking.js");
    const { rankRestaurants } = await compilation.importModule("ai/recommendation/restaurant-ranking.js");
    assert.equal(rankPlaces({ items: [{ id: "mall", name: "商场", category: "购物" }, { id: "lake", name: "西湖", category: "湖泊" }], memoryContext: { preferences: { interests: ["nature"] } } }).sortedItems[0]?.id, "lake");
    const restaurants = [{ id: "first", name: "普通餐厅" }, { id: "second", name: "火锅店", cuisine: ["川菜"], rating: 4.9 }];
    assert.deepEqual(rankRestaurants({ items: restaurants, memoryContext: { preferences: { interests: ["nature"] } } }).sortedItems, restaurants);
  } finally { await compilation.cleanup(); }
});

test("food preference ranks matching restaurants and no preferences preserve order", async () => {
  const compilation = await compileTypeScript(sources, "travel-recommendation-restaurant-");
  try {
    const { rankRestaurants } = await compilation.importModule("ai/recommendation/restaurant-ranking.js");
    const items = [{ id: "plain", name: "普通餐厅" }, { id: "hotpot", name: "老字号火锅", cuisine: ["川菜"], rating: 4.7 }];
    assert.equal(rankRestaurants({ items, memoryContext: { preferences: { interests: ["food"] } } }).sortedItems[0]?.id, "hotpot");
    assert.deepEqual(rankRestaurants({ items }).sortedItems, items);
  } finally { await compilation.cleanup(); }
});
