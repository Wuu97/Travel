import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

test("云端旅行 discovery 明确区分列表、详情与空 tripId，并校验列表响应", async () => {
  const compilation = await compileTypeScript([
    "features/trip/tripId.ts",
    "features/trip/api.ts",
    "features/trip/model.ts",
    "features/trip/members.ts",
  ], "trip-discovery-routing-");
  const originalFetch = globalThis.fetch;
  try {
    const { getTripRequestTarget } = await compilation.importModule("tripId.js");
    const { listAccessibleTrips } = await compilation.importModule("api.js");

    assert.deepEqual(getTripRequestTarget(new Request("https://example.test/api/trips")), { kind: "list" });
    assert.deepEqual(getTripRequestTarget(new Request("https://example.test/api/trips?tripId=")), { kind: "list" });
    assert.deepEqual(getTripRequestTarget(new Request("https://example.test/api/trips?tripId=%20%20")), { kind: "list" });
    assert.deepEqual(getTripRequestTarget(new Request("https://example.test/api/trips?tripId=abc")), { kind: "detail", tripId: "abc" });

    globalThis.fetch = async () => new Response(JSON.stringify({ trips: [
      { id: "owned", title: "我的旅行", startDate: "2026-09-01", endDate: "2026-09-03", status: "筹备中", cloudBacked: true, canDelete: true },
      { id: "shared", title: "共享旅行", startDate: "2026-09-04", endDate: "2026-09-05", status: "筹备中", cloudBacked: true, canDelete: false },
    ] }), { status: 200 });
    const trips = await listAccessibleTrips("access-token");
    assert.deepEqual(trips.map((trip) => [trip.id, trip.canDelete]), [["owned", true], ["shared", false]]);

    globalThis.fetch = async () => new Response(JSON.stringify({ trips: [] }), { status: 200 });
    assert.deepEqual(await listAccessibleTrips("access-token"), []);

    globalThis.fetch = async () => new Response(JSON.stringify({ trip: null }), { status: 200 });
    await assert.rejects(() => listAccessibleTrips("access-token"), /云端旅行列表响应无效/);
  } finally {
    globalThis.fetch = originalFetch;
    await compilation.cleanup();
  }
});
