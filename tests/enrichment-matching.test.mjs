import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const sources = [
  "features/ai/core/parser.ts", "features/ai/enrichment/enrichReply.ts", "features/ai/enrichment/matching.ts", "features/ai/enrichment/places.ts", "features/ai/enrichment/restaurants.ts", "features/ai/enrichment/routes.ts", "features/ai/enrichment/richContent.ts",
  "features/ai/providers/amap/client.ts", "features/ai/providers/amap/index.ts", "features/ai/providers/amap/mapper.ts", "features/ai/providers/amap/places.ts", "features/ai/providers/amap/restaurants.ts", "features/ai/providers/amap/routes.ts", "features/ai/providers/amap/types.ts", "features/ai/providers/types.ts",
  "features/ai/tools/executor.ts", "features/ai/tools/places.ts", "features/ai/tools/restaurants.ts", "features/ai/tools/routes.ts", "features/ai/tools/types.ts", "features/ai/schemas/context.ts", "features/ai/schemas/dataRequests.ts", "features/ai/schemas/response.ts", "features/chat/model.ts", "features/chat/requestValidation.ts", "features/shared/validation.ts", "features/trip/model.ts",
];

test("only verifies exact or strong POI name matches", async () => {
  const output = await mkdtemp(join(tmpdir(), "travel-matching-"));
  try {
    await execFileAsync(join(process.cwd(), "node_modules/.bin/tsc"), ["--target", "ES2022", "--module", "commonjs", "--moduleResolution", "node", "--skipLibCheck", "--outDir", output, ...sources], { cwd: new URL("../", import.meta.url) });
    const { findBestTravelMatch } = await import(new URL(`file://${join(output, "ai/enrichment/enrichReply.js")}`).href);
    const match = (query, names) => findBestTravelMatch(query, names.map((name) => ({ name })))?.name;

    assert.equal(match("成都大熊猫繁育研究基地", ["成都大熊猫繁育研究基地"]), "成都大熊猫繁育研究基地");
    assert.equal(match("陈麻婆豆腐", ["陈麻婆豆腐（骡马市店）"]), "陈麻婆豆腐（骡马市店）");
    assert.equal(match("成都大熊猫繁育研究基地", ["成都大熊猫繁育研究基地(西门)"]), "成都大熊猫繁育研究基地(西门)");
    assert.equal(match("成都大熊猫繁育研究基地", ["成都欢乐谷"]), undefined);
    assert.equal(match("不存在的测试餐厅", ["海底捞火锅"]), undefined);
    assert.equal(match("不存在的测试景点", ["武侯祠", "杜甫草堂", "宽窄巷子"]), undefined);
    assert.equal(match("人民", ["人民公园"]), undefined);
    assert.equal(match("武侯祠", ["成都武侯祠博物馆"]), "成都武侯祠博物馆");
    assert.equal(match("饕林餐厅", ["饕林餐厅（总府路店）"]), "饕林餐厅（总府路店）");
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test("validates bounded dataRequests and keeps malformed parser fallbacks clean", async () => {
  const output = await mkdtemp(join(tmpdir(), "travel-data-requests-"));
  try {
    await execFileAsync(join(process.cwd(), "node_modules/.bin/tsc"), ["--target", "ES2022", "--module", "commonjs", "--moduleResolution", "node", "--skipLibCheck", "--outDir", output, ...sources], { cwd: new URL("../", import.meta.url) });
    const { parseAiReply } = await import(new URL(`file://${join(output, "ai/core/parser.js")}`).href);
    const parsed = parseAiReply(JSON.stringify({ answer: "好的", dataRequests: [
      { type: "place_lookup", query: "武侯祠" }, { type: "place_lookup", query: 123 }, { type: "place_search", query: "景点", limit: 99 }, { type: "restaurant_search", cuisine: "川菜", limit: 0 },
      { type: "route", from: "武侯祠", to: "宽窄巷子", mode: "walking" }, { type: "weather", city: "成都" }, { type: "route", from: 1, to: "x" },
    ] }));
    assert.deepEqual(parsed.dataRequests, [
      { type: "place_lookup", query: "武侯祠", city: undefined, area: undefined },
      { type: "place_search", query: "景点", city: undefined, area: undefined, limit: 5 },
      { type: "restaurant_search", query: undefined, city: undefined, area: undefined, cuisine: "川菜", limit: 1 },
      { type: "route", from: "武侯祠", to: "宽窄巷子", mode: "walking" },
    ]);
    const capped = parseAiReply(JSON.stringify({ answer: "好的", dataRequests: Array.from({ length: 6 }, (_, index) => ({ type: "place_search", query: `地点${index}` })) }));
    assert.equal(capped.dataRequests?.length, 3);
    assert.equal(parseAiReply('{"answer":"半截", "dataRequests":').dataRequests, undefined);
  } finally { await rm(output, { recursive: true, force: true }); }
});

test("executes requests with context, matching, deduplication, and isolated failures", async () => {
  const output = await mkdtemp(join(tmpdir(), "travel-executor-"));
  try {
    await execFileAsync(join(process.cwd(), "node_modules/.bin/tsc"), ["--target", "ES2022", "--module", "commonjs", "--moduleResolution", "node", "--skipLibCheck", "--outDir", output, ...sources], { cwd: new URL("../", import.meta.url) });
    const { executeDataRequests } = await import(new URL(`file://${join(output, "ai/tools/executor.js")}`).href);
    const inputs = [];
    const providers = {
      amapPlaceProvider: { async searchPlaces(input) { inputs.push(input); return input.query === "错误地点" ? [{ id: "wrong", name: "成都欢乐谷", source: { provider: "fake" } }] : [{ id: input.query, name: input.query, source: { provider: "fake" } }]; }, async getPlaceDetails() { return null; } },
      amapRestaurantProvider: { async searchRestaurants(input) { if (input.query === "失败") throw new Error("expected"); return [{ id: "r1", name: "川菜馆", source: { provider: "fake" } }]; }, async getRestaurantDetails() { return null; } },
      amapRouteProvider: { async getRoute(input) { return { from: input.from, to: input.to, mode: input.mode, source: { provider: "fake" } }; } },
    };
    const result = await executeDataRequests([
      { type: "place_lookup", query: "武侯祠" }, { type: "place_lookup", query: "错误地点" },
      { type: "place_search", query: "景点", limit: 3 }, { type: "place_search", query: "景点", limit: 3 },
      { type: "restaurant_search", query: "川菜", limit: 3 }, { type: "restaurant_search", query: "失败", limit: 3 },
      { type: "route", from: "武侯祠", to: "宽窄巷子", mode: "walking" },
    ], { providers, travelContext: { city: "成都", region: "四川" } });
    assert.equal(result.places.length, 2);
    assert.ok(result.places.some((place) => place.name === "武侯祠"));
    assert.ok(!result.places.some((place) => place.name === "成都欢乐谷"));
    assert.equal(result.restaurants.length, 1);
    assert.equal(result.routes.length, 1);
    assert.ok(inputs.every((input) => input.city === "成都"));
  } finally { await rm(output, { recursive: true, force: true }); }
});

test("uses structured travel context to narrow place, restaurant, and route lookups", async () => {
  const output = await mkdtemp(join(tmpdir(), "travel-context-"));
  try {
    await execFileAsync(join(process.cwd(), "node_modules/.bin/tsc"), ["--target", "ES2022", "--module", "commonjs", "--moduleResolution", "node", "--skipLibCheck", "--outDir", output, ...sources], { cwd: new URL("../", import.meta.url) });
    const { enrichAiReply } = await import(new URL(`file://${join(output, "ai/enrichment/enrichReply.js")}`).href);
    const { parseAiRequest } = await import(new URL(`file://${join(output, "chat/requestValidation.js")}`).href);
    const placeInputs = [];
    const restaurantInputs = [];
    const providers = {
      amapPlaceProvider: {
        async searchPlaces(input) { placeInputs.push(input); return [{ id: input.query, name: input.query, latitude: 30, longitude: 104, source: { provider: "amap" } }]; },
        async getPlaceDetails() { return null; },
      },
      amapRestaurantProvider: {
        async searchRestaurants(input) { restaurantInputs.push(input); return [{ id: input.query, name: input.query, source: { provider: "amap" } }]; },
        async getRestaurantDetails() { return null; },
      },
      amapRouteProvider: {
        async getRoute(input) { return { from: input.from, to: input.to, mode: "driving", durationMinutes: 20, distanceMeters: 5_000, source: { provider: "amap" } }; },
      },
    };
    const reply = { content: "回答", itineraryItems: [], expenseItems: [], richContent: { places: [{ name: "人民公园" }], restaurants: [{ name: "饕林餐厅", area: "春熙路" }], routes: [{ from: "人民公园", to: "万象城" }] } };
    await enrichAiReply(reply, providers, { city: "成都", region: "四川" });
    assert.ok(placeInputs.every((input) => input.city === "成都"));
    assert.deepEqual(restaurantInputs[0], { query: "饕林餐厅", city: "成都", area: "春熙路", cuisine: undefined, limit: 5 });

    placeInputs.length = 0;
    await enrichAiReply({ ...reply, richContent: { places: [{ name: "人民公园" }] } }, providers);
    assert.equal(placeInputs[0].city, undefined);
    assert.equal(parseAiRequest({ message: "测试", travelContext: { city: 123 } })?.travelContext, undefined);
    assert.deepEqual(parseAiRequest({ message: "测试", travelContext: { city: "成都", region: "四川" } })?.travelContext, { city: "成都", destination: undefined, region: "四川" });
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});
