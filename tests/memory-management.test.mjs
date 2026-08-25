import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("memory management API uses the authenticated repository boundary", async () => {
  const [listRoute, deleteRoute] = await Promise.all([
    readFile(new URL("app/api/memory/route.ts", root), "utf8"),
    readFile(new URL("app/api/memory/[id]/route.ts", root), "utf8"),
  ]);
  assert.match(listRoute, /requireSupabaseUser/);
  assert.match(listRoute, /getUserMemories\(context\.userId\)/);
  assert.match(deleteRoute, /requireSupabaseUser/);
  assert.match(deleteRoute, /deleteMemory\(context\.userId, id\)/);
  assert.doesNotMatch(`${listRoute}\n${deleteRoute}`, /body\.userId|request\.json\(\)/);
});

test("memory management components provide empty-state and confirmation-aware deletion", async () => {
  const [list, card] = await Promise.all([
    readFile(new URL("features/memory/components/MemoryList.tsx", root), "utf8"),
    readFile(new URL("features/memory/components/MemoryCard.tsx", root), "utf8"),
  ]);
  assert.match(list, /暂无旅行偏好/);
  assert.match(list, /确定删除这个旅行偏好吗？/);
  assert.match(list, /\/api\/memory\//);
  assert.match(card, /删除/);
});
