import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("server 与首次 client render 都从 neutral hydration state 开始", async () => {
  const [app, library, controller] = await Promise.all([
    readFile(new URL("../features/travel/components/TravelApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/trip/components/TripLibrary.tsx", import.meta.url), "utf8"),
    readFile(new URL("../features/trip/hooks/useTripWorkspaceController.ts", import.meta.url), "utf8"),
  ]);
  assert.match(app, /const mounted = useClientMounted\(\);/);
  assert.match(library, /browserReady/);
  assert.match(controller, /const hasTripInUrl = loadPersistedState && typeof window !== "undefined"/);
  assert.doesNotMatch(app, /useSyncExternalStore/);
  assert.doesNotMatch(library, /useClientHydrated/);
  const hydrationBody = library.slice(library.indexOf("const applyItems"), library.indexOf("if (!authReady", library.indexOf("const applyItems")));
  assert.doesNotMatch(hydrationBody, /writeHistoryIfChanged|tuyu-tripchange|replaceState|pushState/);
});
