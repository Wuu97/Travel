import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("首次 hydration 在读取 URL trip 前保持与服务端相同的 workspace 判定", async () => {
  const source = await readFile(new URL("../features/trip/hooks/useTripWorkspaceController.ts", import.meta.url), "utf8");
  assert.match(source, /const hasTripInUrl = loadPersistedState && typeof window !== "undefined"/);
});
