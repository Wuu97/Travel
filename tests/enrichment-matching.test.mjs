import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const sources = [
  "features/ai/image/types.ts", "features/ai/image/normalization.ts", "features/ai/image/enrichPlaceImages.ts", "features/ai/image/enrichExecutedTravelImages.ts", "features/ai/image/providers/types.ts", "features/ai/image/providers/wikimedia/mapper.ts", "features/ai/image/providers/wikimedia/provider.ts",
  "features/ai/core/client.ts", "features/ai/core/parser.ts", "features/ai/core/toolResultReasoning.ts", "features/ai/enrichment/enrichReply.ts", "features/ai/enrichment/matching.ts", "features/ai/enrichment/places.ts", "features/ai/enrichment/restaurants.ts", "features/ai/enrichment/routes.ts", "features/ai/enrichment/richContent.ts",
  "features/ai/providers/amap/client.ts", "features/ai/providers/amap/index.ts", "features/ai/providers/amap/mapper.ts", "features/ai/providers/amap/places.ts", "features/ai/providers/amap/restaurants.ts", "features/ai/providers/amap/routes.ts", "features/ai/providers/amap/types.ts", "features/ai/providers/types.ts",
  "features/ai/tools/executor.ts", "features/ai/tools/places.ts", "features/ai/tools/restaurants.ts", "features/ai/tools/routes.ts", "features/ai/tools/types.ts", "features/ai/schemas/context.ts", "features/ai/schemas/dataRequests.ts", "features/ai/schemas/response.ts", "features/chat/model.ts", "features/chat/requestValidation.ts", "features/shared/validation.ts", "features/trip/model.ts",
];

test("keeps entity image gallery controls bounded and accessible", async () => {
  const source = await readFile(new URL("../features/chat/components/TravelImageGallery.tsx", import.meta.url), "utf8");
  assert.match(source, /images\.slice\(0, 5\)/);
  assert.match(source, /loading="lazy"/);
  assert.match(source, /aria-label="上一张图片"/);
  assert.match(source, /aria-label="下一张图片"/);
  assert.match(source, /galleryNextIndex/);
  assert.match(source, /galleryPreviousIndex/);
  assert.match(source, /setFailedState/);
  assert.match(source, /if \(!availableImages\.length\) return null/);
});

test("does not re-query Amap when verified tool places enter the image pipeline", async () => {
  const output = await mkdtemp(join(tmpdir(), "travel-verified-images-"));
  try {
    await execFileAsync(join(process.cwd(), "node_modules/.bin/tsc"), ["--target", "ES2022", "--module", "commonjs", "--moduleResolution", "node", "--skipLibCheck", "--outDir", output, ...sources], { cwd: new URL("../", import.meta.url) });
    const { executeDataRequests } = await import(new URL(`file://${join(output, "ai/tools/executor.js")}`).href);
    const { enrichExecutedTravelImages } = await import(new URL(`file://${join(output, "ai/image/enrichExecutedTravelImages.js")}`).href);
    const { enrichAiReply } = await import(new URL(`file://${join(output, "ai/enrichment/enrichReply.js")}`).href);
    const { mergeExecutedTravelData } = await import(new URL(`file://${join(output, "ai/enrichment/richContent.js")}`).href);
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
    const legacy = await enrichAiReply({ content: "回答", itineraryItems: [], expenseItems: [], richContent: { places: [{ name: "武侯祠" }] } }, providers, { city: "成都" }, withImages.places);
    const reply = mergeExecutedTravelData(legacy, withImages);
    assert.equal(amapCalls, 1);
    assert.equal(wikimediaCalls, 1);
    assert.equal(reply.richContent?.places?.[0]?.images?.[0]?.source, "search");

    const searchData = await executeDataRequests([{ type: "place_search", query: "成都景点", limit: 1 }], { providers, travelContext: { city: "成都" } });
    const callsAfterToolSearch = amapCalls;
    const searchImages = await enrichExecutedTravelImages(searchData, providers.imageSearchProvider, { city: "成都" });
    await enrichAiReply({ content: "回答", itineraryItems: [], expenseItems: [], richContent: { places: [{ name: "成都武侯祠博物馆" }] } }, providers, { city: "成都" }, searchImages.places);
    assert.equal(amapCalls, callsAfterToolSearch);
  } finally { await rm(output, { recursive: true, force: true }); }
});

test("uses Wikimedia only as a safe place-image fallback", async () => {
  const output = await mkdtemp(join(tmpdir(), "travel-image-search-"));
  try {
    await execFileAsync(join(process.cwd(), "node_modules/.bin/tsc"), ["--target", "ES2022", "--module", "commonjs", "--moduleResolution", "node", "--skipLibCheck", "--outDir", output, ...sources], { cwd: new URL("../", import.meta.url) });
    const { enrichPlaceImages, buildPlaceImageQuery } = await import(new URL(`file://${join(output, "ai/image/enrichPlaceImages.js")}`).href);
    const { mapWikimediaPages } = await import(new URL(`file://${join(output, "ai/image/providers/wikimedia/mapper.js")}`).href);
    const mapped = mapWikimediaPages({ a: { title: "File:景点.jpg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/thumb.jpg", descriptionurl: "https://commons.wikimedia.org/wiki/File:景点.jpg", mime: "image/jpeg", mediatype: "BITMAP" }] }, b: { title: "File:logo.svg", imageinfo: [{ thumburl: "https://upload.wikimedia.org/logo.svg", mime: "image/svg+xml", mediatype: "DRAWING" }] } });
    assert.deepEqual(mapped, [{ url: "https://upload.wikimedia.org/thumb.jpg", source: "search", provider: "wikimedia", alt: "File:景点.jpg", sourceUrl: "https://commons.wikimedia.org/wiki/File:景点.jpg" }]);
    assert.equal(buildPlaceImageQuery({ id: "p", name: "人民公园" }, { city: "成都" }), "成都 人民公园");
    assert.equal(buildPlaceImageQuery({ id: "p", name: "成都人民公园" }, { city: "成都" }), "成都人民公园");
    let calls = 0;
    const search = { async searchImages(input) { calls += 1; assert.deepEqual(input, { query: "成都 人民公园", limit: 3 }); return mapped; } };
    const fallback = await enrichPlaceImages({ id: "p", name: "人民公园" }, search, { city: "成都" });
    assert.deepEqual(fallback.images, mapped);
    const providerImage = { id: "p", name: "人民公园", images: [{ url: "https://amap.example/p.jpg", source: "provider", provider: "amap" }] };
    assert.strictEqual(await enrichPlaceImages(providerImage, search, { city: "成都" }), providerImage);
    assert.equal(calls, 1);
    assert.deepEqual(await enrichPlaceImages({ id: "p", name: "无结果" }, { async searchImages() { return []; } }), { id: "p", name: "无结果" });
    assert.deepEqual(await enrichPlaceImages({ id: "p", name: "失败" }, { async searchImages() { throw new Error("expected"); } }), { id: "p", name: "失败" });
  } finally { await rm(output, { recursive: true, force: true }); }
});

test("enrichment applies image search only to verified places, never restaurants", async () => {
  const output = await mkdtemp(join(tmpdir(), "travel-image-enrichment-"));
  try {
    await execFileAsync(join(process.cwd(), "node_modules/.bin/tsc"), ["--target", "ES2022", "--module", "commonjs", "--moduleResolution", "node", "--skipLibCheck", "--outDir", output, ...sources], { cwd: new URL("../", import.meta.url) });
    const { enrichAiReply } = await import(new URL(`file://${join(output, "ai/enrichment/enrichReply.js")}`).href);
    let imageCalls = 0;
    const providers = {
      amapPlaceProvider: { async searchPlaces() { return [{ id: "p", name: "人民公园", source: { provider: "amap" } }]; }, async getPlaceDetails() { return null; } },
      amapRestaurantProvider: { async searchRestaurants() { return [{ id: "r", name: "川菜馆", source: { provider: "amap" } }]; }, async getRestaurantDetails() { return null; } },
      amapRouteProvider: { async getRoute() { return null; } },
      imageSearchProvider: { async searchImages() { imageCalls += 1; return [{ url: "https://upload.wikimedia.org/place.jpg", source: "search", provider: "wikimedia" }]; } },
    };
    const reply = await enrichAiReply({ content: "回答", itineraryItems: [], expenseItems: [], richContent: { places: [{ name: "人民公园" }], restaurants: [{ name: "川菜馆" }] } }, providers, { city: "成都" });
    assert.equal(imageCalls, 1);
    assert.equal(reply.richContent?.places?.[0]?.images?.[0]?.source, "search");
    assert.equal(reply.richContent?.restaurants?.[0]?.images, undefined);
  } finally { await rm(output, { recursive: true, force: true }); }
});

test("normalizes provider photos safely and carries them into rich place and restaurant cards", async () => {
  const output = await mkdtemp(join(tmpdir(), "travel-images-"));
  try {
    await execFileAsync(join(process.cwd(), "node_modules/.bin/tsc"), ["--target", "ES2022", "--module", "commonjs", "--moduleResolution", "node", "--skipLibCheck", "--outDir", output, ...sources], { cwd: new URL("../", import.meta.url) });
    const { mapAmapPoiToTravelPlace, mapAmapPoiToTravelRestaurant } = await import(new URL(`file://${join(output, "ai/providers/amap/mapper.js")}`).href);
    const { travelPlaceToRichPlace } = await import(new URL(`file://${join(output, "ai/enrichment/places.js")}`).href);
    const { travelRestaurantToRichRestaurant } = await import(new URL(`file://${join(output, "ai/enrichment/restaurants.js")}`).href);
    const photos = [
      { url: " https://images.example/A.jpg ", title: "A" }, { url: "https://images.example/B.jpg" }, { url: "https://images.example/A.jpg" },
      { url: "javascript:alert(1)" }, { url: "data:image/png;base64,abc" }, { url: "file:///secret" }, { url: "blob:https://example.com/id" },
      ...Array.from({ length: 7 }, (_, index) => ({ url: `https://images.example/${index}.jpg` })),
    ];
    const poi = { id: "poi-1", name: "测试地点", photos };
    const place = mapAmapPoiToTravelPlace(poi);
    const restaurant = mapAmapPoiToTravelRestaurant(poi);
    assert.equal(place?.images?.length, 5);
    assert.deepEqual(place?.images?.map((image) => image.url), ["https://images.example/A.jpg", "https://images.example/B.jpg", "https://images.example/0.jpg", "https://images.example/1.jpg", "https://images.example/2.jpg"]);
    assert.ok(place?.images?.every((image) => image.source === "provider"));
    assert.equal(travelPlaceToRichPlace(place ?? { id: "none", name: "none" })?.imageUrl, "https://images.example/A.jpg");
    assert.deepEqual(travelPlaceToRichPlace(place ?? { id: "none", name: "none" })?.images, place?.images);
    assert.equal(travelRestaurantToRichRestaurant(restaurant ?? { id: "none", name: "none" })?.imageUrl, "https://images.example/A.jpg");
    assert.deepEqual(travelRestaurantToRichRestaurant(restaurant ?? { id: "none", name: "none" })?.images, restaurant?.images);
  } finally { await rm(output, { recursive: true, force: true }); }
});

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

test("reasons only over bounded provider facts and safely falls back", async () => {
  const output = await mkdtemp(join(tmpdir(), "travel-reasoning-"));
  try {
    await execFileAsync(join(process.cwd(), "node_modules/.bin/tsc"), ["--target", "ES2022", "--module", "commonjs", "--moduleResolution", "node", "--skipLibCheck", "--outDir", output, ...sources], { cwd: new URL("../", import.meta.url) });
    const { reasonOverToolResults } = await import(new URL(`file://${join(output, "ai/core/toolResultReasoning.js")}`).href);
    const data = {
      places: [{ id: "p", name: "武侯祠", rating: 4.8, openingHours: ["08:30-18:30"], images: [{ url: "https://secret.example/image.jpg" }] }],
      restaurants: [{ id: "r", name: "川菜馆A", rating: 4.8, averagePrice: 70, openingHours: ["11:00-22:00"] }],
      routes: [{ from: { name: "武侯祠" }, to: { name: "宽窄巷子" }, mode: "walking", durationMinutes: 58, distanceMeters: 24800 }],
    };
    let prompt = "";
    const answer = await reasonOverToolResults({ message: "怎么去", firstAnswer: "旧回答", data }, async (messages) => { prompt = messages[1].content; return '{"answer":"基于真实路线约58分钟、24.8公里。"}'; });
    assert.equal(answer, "基于真实路线约58分钟、24.8公里。");
    assert.match(prompt, /4.8/);
    assert.match(prompt, /70/);
    assert.match(prompt, /08:30-18:30/);
    assert.match(prompt, /24800/);
    assert.ok(!prompt.includes("https://secret.example/image.jpg"));
    assert.equal(await reasonOverToolResults({ message: "普通问题", firstAnswer: "旧回答", data: { places: [], restaurants: [], routes: [] } }, async () => { throw new Error("must not call"); }), undefined);
    assert.equal(await reasonOverToolResults({ message: "失败", firstAnswer: "旧回答", data }, async () => { throw new Error("expected"); }), undefined);
    assert.equal(await reasonOverToolResults({ message: "错误 JSON", firstAnswer: "旧回答", data }, async () => "not json"), undefined);
  } finally { await rm(output, { recursive: true, force: true }); }
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
