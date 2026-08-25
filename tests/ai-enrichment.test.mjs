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
    const firstAnswer = "武侯祠建议按 A→B→C 顺序游览，适合上午前往；门票50元，评分4.9。";
    let prompt = ""; let systemPrompt = "";
    const answer = await reasonOverToolResults({ message: "怎么去", firstAnswer, data }, async (messages) => { systemPrompt = messages[0].content; prompt = messages[1].content; return '{"answer":"基于真实路线约58分钟、24.8公里。"}'; });
    assert.equal(answer, "基于真实路线约58分钟、24.8公里。");
    assert.match(prompt, /4.8/); assert.match(prompt, /70/); assert.match(prompt, /08:30-18:30/); assert.match(prompt, /24800/); assert.match(prompt, /A→B→C/); assert.match(prompt, /门票50元/); assert.ok(!prompt.includes("https://secret.example/image.jpg"));
    assert.match(systemPrompt, /Preserve useful itinerary logic/); assert.match(systemPrompt, /not supported by verifiedTravelData/);
    assert.equal(await reasonOverToolResults({ message: "普通问题", firstAnswer: "旧回答", data: { places: [], restaurants: [], routes: [] } }, async () => { throw new Error("must not call"); }), undefined);
    assert.equal(await reasonOverToolResults({ message: "失败", firstAnswer: "旧回答", data }, async () => { throw new Error("expected"); }), undefined);
    assert.equal(await reasonOverToolResults({ message: "错误 JSON", firstAnswer: "旧回答", data }, async () => "not json"), undefined);
  } finally { await compilation.cleanup(); }
});

test("defines detailed travel answer depth while preserving the existing JSON response contract", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-answer-depth-");
  try {
    const { TRAVEL_DATA_REQUESTS_PROMPT, TRAVEL_SYSTEM_PROMPT } = await compilation.importModule("ai/core/prompt.js");
    const { parseAiReply } = await compilation.importModule("ai/core/parser.js");
    assert.match(TRAVEL_SYSTEM_PROMPT, /简单事实、季节或文化问答保持简洁直接/);
    assert.match(TRAVEL_SYSTEM_PROMPT, /单景点\/单餐厅问题写成详细指南/);
    assert.match(TRAVEL_SYSTEM_PROMPT, /## Day 标题/);
    assert.match(TRAVEL_SYSTEM_PROMPT, /评分、评论数、票价或人均、营业时间、实时路线距离\/耗时\/费用/);
    assert.match(TRAVEL_SYSTEM_PROMPT, /没有可靠 provider 上下文时必须省略/);
    assert.match(TRAVEL_DATA_REQUESTS_PROMPT, /具体地点怎么玩、是否值得去等问题应优先使用 place_lookup/);
    assert.match(TRAVEL_DATA_REQUESTS_PROMPT, /餐厅推荐应使用 restaurant_search/);
    assert.match(TRAVEL_DATA_REQUESTS_PROMPT, /明确两点之间怎么去应使用 route/);

    const parsed = parseAiReply(JSON.stringify({
      answer: "## Day 1｜老成都文化线\n\n09:00–11:00 武侯祠\n- 建议按文物区到惠陵的顺序游览。\n- 注意：留出午餐和步行缓冲。",
      richContent: { places: [{ name: "武侯祠", description: "三国文化主题", recommendedDuration: "约2小时" }] },
      itineraryItems: [{ title: "武侯祠", type: "景点", day: 1, time: "09:00" }],
      dataRequests: [{ type: "place_lookup", query: "武侯祠" }],
    }));
    assert.match(parsed.content, /^## Day 1/);
    assert.equal(parsed.richContent?.places?.[0]?.name, "武侯祠");
    assert.equal(parsed.itineraryItems[0]?.day, 1);
    assert.deepEqual(parsed.dataRequests, [{ type: "place_lookup", query: "武侯祠", city: undefined, area: undefined }]);
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

test("keeps Amap AI place, restaurant, and route providers compatible with shared transport", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-ai-amap-");
  try {
    const { AmapClient } = await compilation.importModule("shared/amap/client.js");
    const { AmapPlaceProvider } = await compilation.importModule("ai/providers/amap/places.js");
    const { AmapRestaurantProvider } = await compilation.importModule("ai/providers/amap/restaurants.js");
    const { AmapRouteProvider } = await compilation.importModule("ai/providers/amap/routes.js");
    const { executeDataRequests } = await compilation.importModule("ai/tools/executor.js");
    const paths = [];
    const client = new AmapClient("key", async (url) => {
      const request = new URL(url); paths.push(request.pathname);
      if (request.pathname.includes("direction")) return new Response(JSON.stringify({ status: "1", route: { paths: [{ duration: "120", distance: "800" }] } }));
      return new Response(JSON.stringify({ status: "1", pois: [{ id: "p1", name: "人民公园", location: "104,30", type: "景点" }] }));
    });
    assert.equal((await new AmapPlaceProvider(client).searchPlaces({ query: "人民公园" }))[0]?.name, "人民公园");
    assert.equal((await new AmapRestaurantProvider(client).searchRestaurants({ query: "川菜", limit: 1 }))[0]?.name, "人民公园");
    const route = await new AmapRouteProvider(client).getRoute({ from: { name: "A", longitude: 104, latitude: 30 }, to: { name: "B", longitude: 105, latitude: 31 }, mode: "walking" });
    assert.deepEqual(route && { mode: route.mode, durationMinutes: route.durationMinutes, distanceMeters: route.distanceMeters }, { mode: "walking", durationMinutes: 2, distanceMeters: 800 });
    assert.deepEqual(paths, ["/v5/place/text", "/v5/place/text", "/v5/direction/walking"]);
    const failedClient = new AmapClient("key", async () => new Response("failure", { status: 500 }));
    await assert.rejects(() => new AmapPlaceProvider(failedClient).searchPlaces({ query: "失败" }));
    assert.deepEqual(await executeDataRequests([{ type: "place_lookup", query: "失败" }], {
      providers: {
        amapPlaceProvider: new AmapPlaceProvider(failedClient),
        amapRestaurantProvider: new AmapRestaurantProvider(failedClient),
        amapRouteProvider: new AmapRouteProvider(failedClient),
      },
    }), { places: [], restaurants: [], routes: [] });
  } finally { await compilation.cleanup(); }
});
