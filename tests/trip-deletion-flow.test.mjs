import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

test("trip storage deletion is scoped to the active user", async () => {
  const compilation = await compileTypeScript([
    "features/trip/model.ts", "features/trip/expense.ts", "features/trip/utils.ts", "features/trip/storage.ts",
  ], "trip-delete-storage-");
  const originalWindow = globalThis.window;
  const values = new Map();
  globalThis.window = { localStorage: { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) } };
  globalThis.localStorage = globalThis.window.localStorage;
  try {
    const storage = await compilation.importModule("trip/storage.js");
    storage.saveTrip({ expenses: [], budgetItems: [], plans: [] }, "shared-trip", "user-a");
    storage.saveTripDetails({ title: "A", status: "筹备中", startDate: "2026-01-01", endDate: "2026-01-02", companions: [] }, "shared-trip", "user-a");
    storage.saveTrip({ expenses: [], budgetItems: [], plans: [] }, "shared-trip", "user-b");
    storage.removeTripStorage("shared-trip", "user-a");
    assert.equal(storage.hasStoredTripSnapshot("shared-trip", "user-a"), false);
    assert.equal(storage.hasStoredTripSnapshot("shared-trip", "user-b"), true);
  } finally {
    globalThis.window = originalWindow;
    await compilation.cleanup();
  }
});

test("cloud-delete eligibility distinguishes cloud, authenticated local-only, and guest trips", async () => {
  const compilation = await compileTypeScript(["features/trip/cloudStatus.ts"], "trip-cloud-status-");
  try {
    const { isCloudBackedTrip } = await compilation.importModule("cloudStatus.js");
    assert.equal(isCloudBackedTrip("cloud-trip", "token", new Set(["cloud-trip"])), true);
    assert.equal(isCloudBackedTrip("local-trip", "token", new Set(["cloud-trip"])), false);
    assert.equal(isCloudBackedTrip("cloud-trip", null, new Set(["cloud-trip"])), false);
  } finally { await compilation.cleanup(); }
});

test("cloud deletion uses discovery/remote state and preserves owner-only server auth", async () => {
  const [library, api, route, controller, lifecycle] = await Promise.all([
    readFile(new URL("../features/trip/components/TripLibrary.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/trip/api.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/trips/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/trip/hooks/useTripWorkspaceController.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/trip/hooks/useTripLifecycle.ts", import.meta.url), "utf8"),
  ]);
  assert.match(library, /setCloudTripIds\(new Set\(cloudItems\.map\(\(item\) => item\.id\)\)\)/);
  assert.match(library, /if \(accessToken && isCloudBackedTrip\(tripId, accessToken, cloudTripIds\)\) await deleteSharedTrip\(tripId, accessToken\)/);
  assert.match(library, /tuyu-tripremote/);
  assert.match(library, /catch \(error\)[\s\S]*setDeleteError[\s\S]*return;/);
  assert.match(library, /removeTripStorage\(tripId, storageScope\);[\s\S]*saveTripLibrary\(nextItems, storageScope\)/);
  assert.match(library, /disabled=\{deletingTripId !== null\}/);
  assert.match(library, /url\.searchParams\.delete\("trip"\)[\s\S]*dispatchEvent/);
  assert.match(api, /await response\.json\(\)/);
  assert.match(route, /delete\(\)\.eq\("id", tripId\)\.select\("id"\)\.maybeSingle\(\)/);
  assert.match(route, /只有行程所有者可以删除整个共享行程/);
  assert.doesNotMatch(lifecycle, /deleteSharedTrip|const deleteTrip/);
  assert.match(controller, /hasTripInUrl/);
  const persistence = await readFile(new URL("../features/trip/hooks/useTripPersistence.ts", import.meta.url), "utf8");
  assert.match(persistence, /new CustomEvent\("tuyu-tripremote", \{ detail: tripId \}\)/);
});

test("first authenticated mutation activates a real trip before existing persistence runs", async () => {
  const [controller, library] = await Promise.all([
    readFile(new URL("../features/trip/hooks/useTripWorkspaceController.ts", import.meta.url), "utf8"),
    readFile(new URL("../features/trip/components/TripLibrary.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(controller, /const id = createId\("trip"\)/);
  assert.match(controller, /saveTrip\(\{ expenses, budgetItems, plans \}, id, storageScope\)/);
  assert.match(controller, /saveTripDetails\(tripDetails, id, storageScope\)/);
  assert.match(controller, /saveTripLibrary\(\[\.\.\.loadTripLibrary\(storageScope\), item\], storageScope\)/);
  assert.match(controller, /url\.searchParams\.set\("trip", id\)/);
  assert.match(controller, /enabled: loadPersistedState && Boolean\(activeRealTripId\)/);
  assert.match(controller, /onAddPlan: \(\) => \{ if \(ensureRealTrip\(\)\) addPlan\(\); \}/);
  assert.match(controller, /addItineraryItems: \(items: ItineraryItem\[\]\) => \{ if \(ensureRealTrip\(\)\) addItineraryItems\(items\); \}/);
  assert.match(controller, /tripId !== DEFAULT_TRIP_ID/);
  assert.match(library, /tuyu-tripcreated/);
});
