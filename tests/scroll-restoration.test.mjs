import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("滚动恢复不会写入 history，避免组件重挂载时触发 replaceState 频率限制", async () => {
  const source = await readFile(new URL("../features/navigation/hooks/useScrollRestoration.ts", import.meta.url), "utf8");
  assert.match(source, /window\.history\.scrollRestoration = "manual"/);
  assert.doesNotMatch(source, /replaceState/);
  assert.match(source, /pagehide/);
  assert.match(source, /beforeunload/);
});
