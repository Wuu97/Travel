import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const sources = ["features/memory/model.ts", "features/ai/schemas/context.ts", "features/ai/feedback/model.ts", "features/ai/feedback/analyzer.ts", "features/ai/recommendation/model.ts", "features/ai/recommendation/place-ranking.ts"];
const event = (type, category) => ({ type, itemType: "place", category, timestamp: "2026-08-25T00:00:00.000Z" });

test("adding natural places and skipping shopping creates weak feedback signals", async () => {
  const compilation = await compileTypeScript(sources, "travel-feedback-");
  try {
    const { analyzeFeedbackSignals } = await compilation.importModule("ai/feedback/analyzer.js");
    assert.deepEqual(analyzeFeedbackSignals([event("add_to_trip", "自然景观"), event("skip_recommendation", "购物")]), { interests: ["nature"], dislikes: ["shopping"], preferredTypes: ["place"] });
  } finally { await compilation.cleanup(); }
});

test("explicit memory remains stronger than feedback and no feedback preserves order", async () => {
  const compilation = await compileTypeScript(sources, "travel-feedback-priority-");
  try {
    const { rankPlaces } = await compilation.importModule("ai/recommendation/place-ranking.js");
    const items = [{ id: "mall", name: "购物中心", category: "购物" }, { id: "lake", name: "西湖", category: "自然" }];
    const ranked = rankPlaces({ items, memoryContext: { preferences: { dislikes: ["shopping"] }, feedbackSignals: { interests: ["nature"], dislikes: ["shopping"] } } });
    assert.equal(ranked.sortedItems[0]?.id, "lake");
    assert.deepEqual(rankPlaces({ items }).sortedItems, items);
  } finally { await compilation.cleanup(); }
});
