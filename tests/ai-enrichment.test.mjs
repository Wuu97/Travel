import assert from "node:assert/strict";
import test from "node:test";
import { aiTestSources, compileTypeScript } from "./helpers/compile-typescript.mjs";

test("keeps tool and image enrichment as the only provider-backed pipeline", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-verified-images-");
  try {
    const { executeDataRequests } = await compilation.importModule("ai/tools/executor.js");
    const { enrichExecutedTravelImages } = await compilation.importModule("ai/image/enrichExecutedTravelImages.js");
    const { mergeExecutedTravelData } = await compilation.importModule("ai/enrichment/richContent.js");
    let amapCalls = 0;
    let wikimediaCalls = 0;
    const providers = {
      amapPlaceProvider: { async searchPlaces() { amapCalls += 1; return [{ id: "wuhou", name: "成都武侯祠博物馆", source: { provider: "amap" } }]; }, async getPlaceDetails() { return null; } },
      amapRestaurantProvider: { async searchRestaurants() { return []; }, async getRestaurantDetails() { return null; } },
      amapRouteProvider: { async getRoute() { return null; } },
      imageSearchProvider: { async searchImages() { wikimediaCalls += 1; return [{ url: "https://upload.wikimedia.org/wuhou.jpg", source: "search", provider: "wikimedia" }]; } },
    };
    const data = await executeDataRequests([{ type: "place_lookup", query: "武侯祠" }], { providers, travelContext: { city: "成都" } });
    assert.equal(amapCalls, 1);
    const withImages = await enrichExecutedTravelImages(data, providers.imageSearchProvider, { city: "成都" });
    const reply = mergeExecutedTravelData({ content: "回答", itineraryItems: [], expenseItems: [], richContent: {
      places: [{ name: "武侯祠", description: "模型说明", recommendedDuration: "2小时", itineraryItem: { title: "Day 1", type: "活动" } }],
      restaurants: [{ name: "模型餐厅", description: "模型餐厅说明", recommendedDishes: ["回锅肉"], itineraryItem: { title: "Day 1 午餐", type: "餐饮" } }],
      routes: [{ from: "武侯祠", to: "宽窄巷子", description: "模型路线说明", itineraryItem: { title: "Day 1 下午", type: "交通" } }],
    } }, withImages);
    assert.equal(amapCalls, 1);
    assert.equal(wikimediaCalls, 1);
    assert.equal(reply.richContent?.places?.[0]?.images?.[0]?.source, "search");
    assert.equal(reply.richContent?.places?.[1]?.description, "模型说明");
    assert.equal(reply.richContent?.places?.[1]?.recommendedDuration, "2小时");
    assert.equal(reply.richContent?.places?.[1]?.itineraryItem?.title, "Day 1");
    assert.equal(reply.richContent?.restaurants?.[0]?.description, "模型餐厅说明");
    assert.deepEqual(reply.richContent?.restaurants?.[0]?.recommendedDishes, ["回锅肉"]);
    assert.equal(reply.richContent?.restaurants?.[0]?.itineraryItem?.title, "Day 1 午餐");
    assert.equal(reply.richContent?.routes?.[0]?.description, "模型路线说明");
    assert.equal(reply.richContent?.routes?.[0]?.itineraryItem?.title, "Day 1 下午");
    const searchData = await executeDataRequests([{ type: "place_search", query: "成都景点", limit: 1 }], { providers, travelContext: { city: "成都" } });
    const callsAfterToolSearch = amapCalls;
    const searchImages = await enrichExecutedTravelImages(searchData, providers.imageSearchProvider, { city: "成都" });
    mergeExecutedTravelData({ content: "回答", itineraryItems: [], expenseItems: [], richContent: { places: [{ name: "成都武侯祠博物馆" }] } }, searchImages);
    assert.equal(amapCalls, callsAfterToolSearch);
    assert.equal(wikimediaCalls, 2);
  } finally { await compilation.cleanup(); }
});

test("reasons only over bounded provider facts and safely falls back", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-reasoning-");
  try {
    const { reasonOverToolResults } = await compilation.importModule("ai/core/toolResultReasoning.js");
    const data = { places: [{ id: "p", name: "武侯祠", rating: 4.8, openingHours: ["08:30-18:30"], images: [{ url: "https://secret.example/image.jpg" }] }], restaurants: [{ id: "r", name: "川菜馆A", rating: 4.8, averagePrice: 70, openingHours: ["11:00-22:00"] }], routes: [{ from: { name: "武侯祠" }, to: { name: "宽窄巷子" }, mode: "walking", durationMinutes: 58, distanceMeters: 24800 }] };
    let prompt = "";
    const answer = await reasonOverToolResults({ message: "怎么去", firstAnswer: "旧回答", data }, async (messages) => { prompt = messages[1].content; return '{"answer":"基于真实路线约58分钟、24.8公里。"}'; });
    assert.equal(answer, "基于真实路线约58分钟、24.8公里。");
    assert.match(prompt, /4.8/); assert.match(prompt, /70/); assert.match(prompt, /08:30-18:30/); assert.match(prompt, /24800/); assert.ok(!prompt.includes("https://secret.example/image.jpg"));
    assert.equal(await reasonOverToolResults({ message: "普通问题", firstAnswer: "旧回答", data: { places: [], restaurants: [], routes: [] } }, async () => { throw new Error("must not call"); }), undefined);
    assert.equal(await reasonOverToolResults({ message: "失败", firstAnswer: "旧回答", data }, async () => { throw new Error("expected"); }), undefined);
    assert.equal(await reasonOverToolResults({ message: "错误 JSON", firstAnswer: "旧回答", data }, async () => "not json"), undefined);
  } finally { await compilation.cleanup(); }
});

test("validates bounded dataRequests and keeps malformed parser fallbacks clean", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-data-requests-");
  try {
    const { parseAiReply } = await compilation.importModule("ai/core/parser.js");
    const parsed = parseAiReply(JSON.stringify({ answer: "好的", dataRequests: [{ type: "place_lookup", query: "武侯祠" }, { type: "place_lookup", query: 123 }, { type: "place_search", query: "景点", limit: 99 }, { type: "restaurant_search", cuisine: "川菜", limit: 0 }, { type: "route", from: "武侯祠", to: "宽窄巷子", mode: "walking" }, { type: "weather", city: "成都" }, { type: "route", from: 1, to: "x" }] }));
    assert.deepEqual(parsed.dataRequests, [{ type: "place_lookup", query: "武侯祠", city: undefined, area: undefined }, { type: "place_search", query: "景点", city: undefined, area: undefined, limit: 5 }, { type: "restaurant_search", query: undefined, city: undefined, area: undefined, cuisine: "川菜", limit: 1 }, { type: "route", from: "武侯祠", to: "宽窄巷子", mode: "walking" }]);
    const capped = parseAiReply(JSON.stringify({ answer: "好的", dataRequests: Array.from({ length: 6 }, (_, index) => ({ type: "place_search", query: `地点${index}` })) }));
    assert.equal(capped.dataRequests?.length, 3);
    assert.equal(parseAiReply('{"answer":"半截", "dataRequests":').dataRequests, undefined);
  } finally { await compilation.cleanup(); }
});

test("executes requests with context, matching, deduplication, and isolated failures", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-executor-");
  try {
    const { executeDataRequests } = await compilation.importModule("ai/tools/executor.js");
    const { mergeExecutedTravelData } = await compilation.importModule("ai/enrichment/richContent.js");
    const inputs = [];
    const providers = { amapPlaceProvider: { async searchPlaces(input) { inputs.push(input); return input.query === "错误地点" ? [{ id: "wrong", name: "成都欢乐谷", source: { provider: "fake" } }] : [{ id: input.query, name: input.query, source: { provider: "fake" } }]; }, async getPlaceDetails() { return null; } }, amapRestaurantProvider: { async searchRestaurants(input) { if (input.query === "失败") throw new Error("expected"); return [{ id: "r1", name: "川菜馆", source: { provider: "fake" } }]; }, async getRestaurantDetails() { return null; } }, amapRouteProvider: { async getRoute(input) { return { from: input.from, to: input.to, mode: input.mode, source: { provider: "fake" } }; } } };
    const result = await executeDataRequests([{ type: "place_lookup", query: "武侯祠" }, { type: "place_lookup", query: "错误地点" }, { type: "place_search", query: "景点", limit: 3 }, { type: "place_search", query: "景点", limit: 3 }, { type: "restaurant_search", query: "川菜", limit: 3 }, { type: "restaurant_search", query: "失败", limit: 3 }, { type: "route", from: "武侯祠", to: "宽窄巷子", mode: "walking" }], { providers, travelContext: { city: "成都", region: "四川" } });
    assert.equal(result.places.length, 2); assert.ok(result.places.some((place) => place.name === "武侯祠")); assert.ok(!result.places.some((place) => place.name === "成都欢乐谷")); assert.equal(result.restaurants.length, 1); assert.equal(result.routes.length, 1); assert.ok(inputs.every((input) => input.city === "成都"));
    assert.equal(mergeExecutedTravelData({ content: "文字回答仍可返回", itineraryItems: [], expenseItems: [] }, result).content, "文字回答仍可返回");
  } finally { await compilation.cleanup(); }
});

test("uses structured travel context to narrow place, restaurant, and route lookups", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-context-");
  try {
    const { executeDataRequests } = await compilation.importModule("ai/tools/executor.js");
    const { parseAiRequest } = await compilation.importModule("chat/requestValidation.js");
    const placeInputs = []; const restaurantInputs = [];
    const providers = { amapPlaceProvider: { async searchPlaces(input) { placeInputs.push(input); return [{ id: input.query, name: input.query, latitude: 30, longitude: 104, source: { provider: "amap" } }]; }, async getPlaceDetails() { return null; } }, amapRestaurantProvider: { async searchRestaurants(input) { restaurantInputs.push(input); return [{ id: input.query, name: input.query, source: { provider: "amap" } }]; }, async getRestaurantDetails() { return null; } }, amapRouteProvider: { async getRoute(input) { return { from: input.from, to: input.to, mode: "driving", durationMinutes: 20, distanceMeters: 5_000, source: { provider: "amap" } }; } } };
    await executeDataRequests([{ type: "place_lookup", query: "人民公园" }, { type: "restaurant_search", query: "饕林餐厅", area: "春熙路", limit: 5 }, { type: "route", from: "人民公园", to: "万象城", mode: "driving" }], { providers, travelContext: { city: "成都", region: "四川" } });
    assert.ok(placeInputs.every((input) => input.city === "成都"));
    assert.deepEqual(restaurantInputs[0], { query: "饕林餐厅", city: "成都", area: "春熙路", cuisine: undefined, limit: 5 });
    placeInputs.length = 0;
    await executeDataRequests([{ type: "place_lookup", query: "人民公园" }], { providers });
    assert.equal(placeInputs[0].city, undefined);
    assert.equal(parseAiRequest({ message: "测试", travelContext: { city: 123 } })?.travelContext, undefined);
    assert.deepEqual(parseAiRequest({ message: "测试", travelContext: { city: "成都", region: "四川" } })?.travelContext, { city: "成都", destination: undefined, region: "四川" });
  } finally { await compilation.cleanup(); }
});
