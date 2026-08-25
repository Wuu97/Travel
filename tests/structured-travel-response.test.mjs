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
