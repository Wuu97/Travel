import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { aiTestSources, compileTypeScript } from "./helpers/compile-typescript.mjs";

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

test("uses Wikimedia only as a safe place-image fallback", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-image-search-");
  try {
    const { enrichPlaceImages, buildPlaceImageQuery } = await compilation.importModule("ai/image/enrichPlaceImages.js");
    const { mapWikimediaPages } = await compilation.importModule("ai/image/providers/wikimedia/mapper.js");
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
  } finally { await compilation.cleanup(); }
});

test("executed image enrichment searches only verified places, never restaurants", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-image-enrichment-");
  try {
    const { enrichExecutedTravelImages } = await compilation.importModule("ai/image/enrichExecutedTravelImages.js");
    let imageCalls = 0;
    const provider = { async searchImages() { imageCalls += 1; return [{ url: "https://upload.wikimedia.org/place.jpg", source: "search", provider: "wikimedia" }]; } };
    const data = await enrichExecutedTravelImages({ places: [{ id: "p", name: "人民公园" }], restaurants: [{ id: "r", name: "川菜馆" }], routes: [] }, provider, { city: "成都" });
    assert.equal(imageCalls, 1);
    assert.equal(data.places[0]?.images?.[0]?.source, "search");
    assert.equal(data.restaurants[0]?.images, undefined);
  } finally { await compilation.cleanup(); }
});

test("normalizes provider photos safely and carries them into rich place and restaurant cards", async () => {
  const compilation = await compileTypeScript(aiTestSources, "travel-images-");
  try {
    const { mapAmapPoiToTravelPlace, mapAmapPoiToTravelRestaurant } = await compilation.importModule("ai/providers/amap/mapper.js");
    const { travelPlaceToRichPlace } = await compilation.importModule("ai/enrichment/places.js");
    const { travelRestaurantToRichRestaurant } = await compilation.importModule("ai/enrichment/restaurants.js");
    const photos = [{ url: " https://images.example/A.jpg ", title: "A" }, { url: "https://images.example/B.jpg" }, { url: "https://images.example/A.jpg" }, { url: "javascript:alert(1)" }, { url: "data:image/png;base64,abc" }, { url: "file:///secret" }, { url: "blob:https://example.com/id" }, ...Array.from({ length: 7 }, (_, index) => ({ url: `https://images.example/${index}.jpg` }))];
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
  } finally { await compilation.cleanup(); }
});
