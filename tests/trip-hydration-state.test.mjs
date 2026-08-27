import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

test("server 与首次 client render 都从 neutral hydration state 开始", async () => {
  const [app, library, controller] = await Promise.all([
    readFile(new URL("../features/travel/components/TravelApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/trip/components/TripLibrary.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/trip/hooks/useTripWorkspaceController.ts", import.meta.url), "utf8"),
  ]);
  assert.match(app, /const mounted = useClientMounted\(\);/);
  assert.doesNotMatch(app, /key=\{mounted/);
  assert.match(library, /browserReady/);
  assert.match(controller, /const hasTripInUrl = loadPersistedState && typeof window !== "undefined"/);
  assert.doesNotMatch(app, /useSyncExternalStore/);
  assert.doesNotMatch(library, /useClientHydrated/);
  const hydrationBody = library.slice(library.indexOf("const applyItems"), library.indexOf("if (!authReady", library.indexOf("const applyItems")));
  assert.doesNotMatch(hydrationBody, /writeHistoryIfChanged|tuyu-tripchange|replaceState|pushState/);
});

test("neutral trip bootstrap 在服务端与浏览器环境使用完全相同的初始状态", async () => {
    const compilation = await compileTypeScript([
    "features/trip/bootstrapState.ts",
    "features/trip/data.ts",
    "features/trip/model.ts",
    "features/trip/tripId.ts",
  ], "trip-neutral-bootstrap-");
  try {
    const { createNeutralTripBootstrap } = await compilation.importModule("bootstrapState.js");
    const serverBootstrap = createNeutralTripBootstrap();
    const browserBootstrap = createNeutralTripBootstrap();
    assert.deepEqual(browserBootstrap, serverBootstrap);
    assert.equal(serverBootstrap.tripId, "hangzhou-summer-trip");
  } finally {
    await compilation.cleanup();
  }
});
