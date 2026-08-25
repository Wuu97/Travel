import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const clientSource = ["features/shared/amap/client.ts"];

test("builds Amap URLs with the shared base URL, API key, and query parameters", async () => {
  const compilation = await compileTypeScript(clientSource, "travel-amap-client-");
  try {
    const { AmapClient } = await compilation.importModule("client.js");
    let requestedUrl;
    const client = new AmapClient("test key", async (url) => { requestedUrl = new URL(url); return new Response(JSON.stringify({ status: "1", info: "OK", pois: [] })); });
    await client.request("/v5/place/text", { keywords: "人民公园", city: "成都", page_size: 5 });
    assert.equal(requestedUrl.origin, "https://restapi.amap.com");
    assert.equal(requestedUrl.pathname, "/v5/place/text");
    assert.deepEqual(Object.fromEntries(requestedUrl.searchParams), { key: "test key", keywords: "人民公园", city: "成都", page_size: "5" });
  } finally { await compilation.cleanup(); }
});

test("fails shared Amap requests on HTTP failure", async () => {
  const compilation = await compileTypeScript(clientSource, "travel-amap-http-");
  try {
    const { AmapClient, AmapHttpError } = await compilation.importModule("client.js");
    const client = new AmapClient("key", async () => new Response("failure", { status: 500 }));
    await assert.rejects(() => client.request("/v5/place/text", {}), AmapHttpError);
  } finally { await compilation.cleanup(); }
});

test("fails shared Amap requests on Amap business failure", async () => {
  const compilation = await compileTypeScript(clientSource, "travel-amap-status-");
  try {
    const { AmapClient, AmapStatusError } = await compilation.importModule("client.js");
    const client = new AmapClient("key", async () => new Response(JSON.stringify({ status: "0", info: "INVALID_USER_KEY", infocode: "10001" })));
    await assert.rejects(() => client.request("/v5/place/text", {}), AmapStatusError);
  } finally { await compilation.cleanup(); }
});

test("returns successful Amap responses through the shared client", async () => {
  const compilation = await compileTypeScript(clientSource, "travel-amap-success-");
  try {
    const { AmapClient } = await compilation.importModule("client.js");
    const client = new AmapClient("key", async () => new Response(JSON.stringify({ status: "1", info: "OK", pois: [] })));
    assert.deepEqual(await client.request("/v5/place/text", {}), { status: "1", info: "OK", pois: [] });
  } finally { await compilation.cleanup(); }
});

test("keeps the Places Amap provider response behavior after transport consolidation", async () => {
  const compilation = await compileTypeScript(["features/shared/amap/client.ts", "features/places/amap.ts", "features/places/model.ts", "features/trip/model.ts"], "travel-places-amap-");
  try {
    const { AmapPlaceProvider } = await compilation.importModule("places/amap.js");
    const provider = new AmapPlaceProvider("key", async () => new Response(JSON.stringify({ status: "1", pois: [{ typecode: "110000", business: { rating: "4.8", cost: "30", business_time: "09:00-18:00" } }] })));
    assert.deepEqual(await provider.lookup("人民公园", "成都"), { category: "景点", confidence: "high", provider: "amap", place: { provider: "amap", rating: 4.8, averageCost: 30, openingHours: "09:00-18:00" } });
    const unavailable = new AmapPlaceProvider("key", async () => new Response("failure", { status: 500 }));
    assert.equal(await unavailable.lookup("人民公园"), null);
  } finally { await compilation.cleanup(); }
});
