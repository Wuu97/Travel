import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const sources = ["features/memory/model.ts", "features/ai/schemas/context.ts", "features/ai/feedback/model.ts", "features/ai/feedback/analyzer.ts", "features/ai/recommendation/model.ts", "features/ai/recommendation/place-ranking.ts"];
const event = (type, category) => ({ type, itemType: "place", category, timestamp: "2026-08-25T00:00:00.000Z" });

test("feedback requires two matching events and cancels conflicting behavior", async () => {
  const compilation = await compileTypeScript(sources, "travel-feedback-");
  try {
    const { analyzeFeedbackSignals } = await compilation.importModule("ai/feedback/analyzer.js");
    assert.deepEqual(analyzeFeedbackSignals([event("add_to_trip", "自然景观")]).interests, undefined);
    assert.deepEqual(analyzeFeedbackSignals([event("add_to_trip", "自然景观"), event("add_to_trip", "自然景观")]).interests, ["nature"]);
    assert.deepEqual(analyzeFeedbackSignals([event("skip_recommendation", "购物"), event("skip_recommendation", "购物")]).dislikes, ["shopping"]);
    assert.deepEqual(analyzeFeedbackSignals([event("add_to_trip", "自然景观"), event("add_to_trip", "自然景观"), event("skip_recommendation", "自然景观"), event("skip_recommendation", "自然景观")]).interests, undefined);
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

test("feedback events are validated and forwarded through the AI request pipeline", async () => {
  const [validation, chatHook, route, orchestrator, collector] = await Promise.all([
    readFile(new URL("../features/chat/requestValidation.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/chat/hooks/useTravelChat.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/ai/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/ai/core/orchestrator.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/ai/feedback/collector.ts", import.meta.url), "utf8"),
  ]);
  assert.match(validation, /slice\(-MAX_FEEDBACK_EVENTS\)/);
  assert.match(chatHook, /feedbackEvents/);
  assert.match(route, /requestTravelAdvice\(\{ \.\.\.payload, loadMemories \}\)/);
  assert.match(orchestrator, /analyzeFeedbackSignals\(feedbackEvents \?\? \[\]\)/);
  assert.match(collector, /MAX_FEEDBACK_EVENTS = 50/);
});
