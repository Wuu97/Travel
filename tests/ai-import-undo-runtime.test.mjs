import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

test("mixed AI import 与撤销按稳定 ID 实际更新两类状态", async () => {
  const compilation = await compileTypeScript(["features/trip/hooks/useTripImports.ts", "features/trip/model.ts", "features/trip/expense.ts", "features/trip/expenseRelations.ts", "features/trip/utils.ts", "features/shared/utils/createId.ts"], "ai-import-undo-");
  try {
    const { applyAiImportBatch, undoAiImportBatch } = await compilation.importModule("trip/hooks/useTripImports.js");
    const A = { id: "a", title: "A", type: "景点", day: 1 }, B = { id: "b", title: "B", type: "餐饮", day: 1 };
    const X = { id: "x", title: "X", amount: 10, type: "门票", occurrence: "estimated", relatedItineraryItemId: "a" }, Y = { id: "y", title: "Y", amount: 20, type: "餐饮", occurrence: "estimated" };
    const first = applyAiImportBatch([], [], [A, B], [X, Y]);
    assert.deepEqual(first.batch?.itineraryItemIds, ["a", "b"]); assert.equal(first.batch?.budgetItemIds.length, 2); assert.equal(first.plans.length, 2); assert.equal(first.budgetItems.length, 2);
    const undone = undoAiImportBatch(first.plans, first.budgetItems, first.batch);
    assert.equal(undone.plans.length, 0); assert.equal(undone.budgetItems.length, 0);
    const duplicate = applyAiImportBatch([A], [], [A, B], [X]);
    assert.deepEqual(duplicate.batch?.itineraryItemIds, ["b"]); assert.equal(duplicate.batch?.budgetItemIds.length, 1);
    const edited = undoAiImportBatch([{ ...A, title: "编辑后" }], [], { batchId: "1", importedAt: 0, itineraryItemIds: ["a"], budgetItemIds: [] }); assert.equal(edited.plans.length, 0);
    const second = applyAiImportBatch(first.plans, first.budgetItems, [{ id: "c", title: "C", type: "景点", day: 1 }], []); const onlySecond = undoAiImportBatch(second.plans, second.budgetItems, second.batch); assert.ok(onlySecond.plans.some((item) => item.id === "a"));
  } finally { await compilation.cleanup(); }
});
