import assert from "node:assert/strict";
import test from "node:test";
import { aiTestSources, compileTypeScript } from "./helpers/compile-typescript.mjs";

test("parses a structured travel response into an answer and place card", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-structured-response-");
  try {
    const { parseAiReply } = await compilation.importModule("ai/core/parser.js");
    const reply = parseAiReply(JSON.stringify({ answer: "西湖攻略", places: [{ id: "west-lake", name: "西湖", rating: 4.8, category: "自然景点" }], itineraryActions: [{ type: "add_place", targetId: "west-lake", title: "添加西湖到行程" }] }));
    assert.equal(reply.content, "西湖攻略");
    assert.equal(reply.structuredTravelResponse?.places?.[0]?.rating, 4.8);
    assert.equal(reply.richContent?.places?.[0]?.name, "西湖");
    assert.equal(reply.richContent?.places?.[0]?.itineraryItem?.title, "西湖");
  } finally { await compilation.cleanup(); }
});

test("accepts fenced JSON and keeps malformed output as Markdown fallback", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-structured-fallback-");
  try {
    const { parseStructuredTravelResponse } = await compilation.importModule("ai/parser/travel-response-parser.js");
    assert.equal(parseStructuredTravelResponse('```json\n{"answer":"西湖"}\n```').response.answer, "西湖");
    const fallback = parseStructuredTravelResponse("**旧版 Markdown 回复**");
    assert.equal(fallback.isStructured, false);
    assert.equal(fallback.response.answer, "**旧版 Markdown 回复**");
  } finally { await compilation.cleanup(); }
});

test("does not surface unverified model restaurant cards", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-structured-restaurants-");
  try {
    const { parseAiReply } = await compilation.importModule("ai/core/parser.js");
    const reply = parseAiReply(JSON.stringify({ answer: "推荐餐厅", restaurants: [{ name: "不存在的餐厅", rating: 5 }] }));
    assert.deepEqual(reply.structuredTravelResponse?.restaurants, []);
    assert.equal(reply.richContent?.restaurants, undefined);
  } finally { await compilation.cleanup(); }
});

test("parses structured expense suggestions as estimated budgets with itinerary links", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-structured-expenses-");
  try {
    const { parseAiReply } = await compilation.importModule("ai/core/parser.js");
    const reply = parseAiReply(JSON.stringify({ answer: "杭州两日预算", expenses: [
      { id: "stay", title: "西湖住宿", amount: 1600, category: "住宿", occurrence: "actual" },
      { id: "ticket", title: "灵隐寺门票", amount: 75, category: "门票", occurrence: "estimated", relatedItineraryItemId: "lingyin", relatedItineraryTitle: "灵隐寺" },
      { id: "unknown", title: "待定费用", category: "其他" },
    ] }));
    assert.deepEqual(reply.expenseItems, [
      { id: "stay", title: "西湖住宿", amount: 1600, type: "住宿", occurrence: "estimated" },
      { id: "ticket", title: "灵隐寺门票", amount: 75, type: "门票", occurrence: "estimated", relatedItineraryItemId: "lingyin", relatedItineraryTitle: "灵隐寺" },
    ]);
    assert.equal(reply.structuredTravelResponse?.expenses?.[1]?.relatedItineraryItemId, "lingyin");
  } finally { await compilation.cleanup(); }
});

test("keeps legacy expenseItems responses readable while importing them as budgets", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-legacy-expenses-");
  try {
    const { parseAiReply } = await compilation.importModule("ai/core/parser.js");
    const reply = parseAiReply(JSON.stringify({ answer: "旧响应", expenseItems: [{ id: "legacy", title: "交通", amount: 300, type: "交通", occurrence: "actual" }] }));
    assert.deepEqual(reply.expenseItems, [{ id: "legacy", title: "交通", amount: 300, type: "交通", occurrence: "estimated" }]);
  } finally { await compilation.cleanup(); }
});

test("uses the same stable ID for equivalent structured and legacy expense suggestions", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-stable-expense-ids-");
  try {
    const { parseAiReply } = await compilation.importModule("ai/core/parser.js");
    const structured = JSON.stringify({ answer: "预算", expenses: [{ title: "灵隐寺门票", amount: 75, category: "门票", relatedItineraryItemId: "lingyin", relatedItineraryTitle: "灵隐寺" }] });
    const legacy = JSON.stringify({ answer: "预算", expenseItems: [{ title: "灵隐寺门票", amount: 75, type: "门票", relatedItineraryItemId: "lingyin", relatedItineraryTitle: "灵隐寺" }] });
    const first = parseAiReply(structured);
    const second = parseAiReply(structured);
    const legacyReply = parseAiReply(legacy);
    assert.equal(first.expenseItems[0].id, second.expenseItems[0].id);
    assert.equal(first.expenseItems[0].id, legacyReply.expenseItems[0].id);
    assert.equal(first.itineraryItems.length, 0);
  } finally { await compilation.cleanup(); }
});
