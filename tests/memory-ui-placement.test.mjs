import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("the signed-in account menu mounts the reusable travel-preferences list", async () => {
  const [navigation, app, sections] = await Promise.all([
    readFile(new URL("features/navigation/components/QuickNavigation.tsx", root), "utf8"),
    readFile(new URL("features/travel/components/TravelAppContent.tsx", root), "utf8"),
    readFile(new URL("features/landing/components/TravelDiscoverySections.tsx", root), "utf8"),
  ]);

  assert.match(navigation, /import \{ MemoryList \} from "\.\.\/\.\.\/memory\/components\/MemoryList"/);
  assert.match(navigation, /旅行偏好/);
  assert.match(navigation, /<MemoryList accessToken=\{accessToken\} \/>/);
  assert.match(app, /accessToken=\{auth\.accessToken\}/);
  assert.match(sections, /accessToken=\{accessToken\}/);
});

test("anonymous users do not request the memory API", async () => {
  const list = await readFile(new URL("features/memory/components/MemoryList.tsx", root), "utf8");
  const guard = list.indexOf("if (!accessToken)");
  const request = list.indexOf('fetch("/api/memory"');

  assert.ok(guard >= 0);
  assert.ok(request > guard);
});
