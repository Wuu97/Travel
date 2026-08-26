import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const sources = [
  "features/memory/model.ts",
  "features/ai/feedback/model.ts",
  "features/ai/schemas/context.ts",
  "features/ai/recommendation/model.ts",
  "features/ai/recommendation/diversity.ts",
  "features/ai/recommendation/explanation.ts",
  "features/ai/recommendation/place-ranking.ts",
  "features/ai/recommendation/restaurant-ranking.ts",
];

test("diversifies equally ranked place categories deterministically", async () => {
  const compilation = await compileTypeScript(sources, "travel-recommendation-diversity-place-");
  try {
    const { rankPlaces } = await compilation.importModule("ai/recommendation/place-ranking.js");
    const items = [
      { id: "lake", name: "西湖", category: "自然" },
      { id: "park", name: "湿地公园", category: "自然" },
      { id: "museum", name: "博物馆", category: "文化" },
    ];
    const context = { preferences: { interests: ["nature", "culture"] } };
    const first = rankPlaces({ items, memoryContext: context });
    const second = rankPlaces({ items, memoryContext: context });
    assert.deepEqual(first.sortedItems.map((item) => item.id), ["lake", "museum", "park"]);
    assert.deepEqual(second.sortedItems.map((item) => item.id), first.sortedItems.map((item) => item.id));
  } finally { await compilation.cleanup(); }
});

test("diversifies cuisines but does not displace a much higher scoring restaurant", async () => {
  const compilation = await compileTypeScript(sources, "travel-recommendation-diversity-restaurant-");
  try {
    const { rankRestaurants } = await compilation.importModule("ai/recommendation/restaurant-ranking.js");
    const items = [
      { id: "hotpot-a", name: "老字号火锅", cuisine: ["火锅"], rating: 5 },
      { id: "hotpot-b", name: "火锅店", cuisine: ["火锅"], rating: 4.8 },
      { id: "seafood", name: "海鲜餐厅", cuisine: ["海鲜"], rating: 4.8 },
    ];
    const result = rankRestaurants({ items, memoryContext: { preferences: { interests: ["food"] } } });
    assert.deepEqual(result.sortedItems.map((item) => item.id), ["hotpot-a", "seafood", "hotpot-b"]);
  } finally { await compilation.cleanup(); }
});

test("reasons are rule-derived, concise, and absent without matching preferences", async () => {
  const compilation = await compileTypeScript(sources, "travel-recommendation-reasons-");
  try {
    const { rankPlaces } = await compilation.importModule("ai/recommendation/place-ranking.js");
    const result = rankPlaces({ items: [{ id: "lake", name: "西湖", category: "自然景观" }], memoryContext: { preferences: { interests: ["nature"], pace: "relaxed", transport: "self_drive" } } });
    assert.deepEqual(result.scores[0]?.reasons, ["符合自然风景偏好", "适合慢节奏游览"]);
    assert.equal(result.scores[0]?.reasons.length, 2);
    const unpersonalized = [{ id: "first", name: "湖", category: "自然" }, { id: "second", name: "山", category: "自然" }, { id: "third", name: "博物馆", category: "文化" }];
    const plainResult = rankPlaces({ items: unpersonalized });
    assert.deepEqual(plainResult.scores[0]?.reasons, []);
    assert.deepEqual(plainResult.sortedItems, unpersonalized);
  } finally { await compilation.cleanup(); }
});
