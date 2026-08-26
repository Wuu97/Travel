import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("混合导入选中项只通过一次 batch 回调提交两类项目", async () => {
  const [panel, imports] = await Promise.all([
    readFile(new URL("features/chat/components/ChatImportPanel.tsx", root), "utf8"),
    readFile(new URL("features/trip/hooks/useTripImports.ts", root), "utf8"),
  ]);
  assert.match(panel, /const hasMixedSelection = selectedItineraries\.length > 0 && selectedBudget\.length > 0;/);
  assert.match(panel, /onAddImportBatch\(selectedItineraries, selectedBudget\)/);
  assert.match(panel, /selectedItineraries\.length > 0 && !hasMixedSelection/);
  assert.match(panel, /selectedBudget\.length > 0 && !hasMixedSelection/);
  assert.match(imports, /recordBatch\(addedPlans\.map\(\(item\) => item\.id\), addedBudget\.map\(\(item\) => item\.id\)\);/);
});
