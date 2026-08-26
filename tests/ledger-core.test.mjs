import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const sources = [
  "features/shared/utils/createId.ts",
  "features/trip/model.ts",
  "features/trip/expense.ts",
  "features/trip/budgetRules.ts",
];

test("normalizes legacy LedgerItem data while retaining actual expense metadata", async () => {
  const compilation = await compileTypeScript(sources, "ledger-core-");
  try {
    const { normalizeTripExpense, createTripExpense } = await compilation.importModule("trip/expense.js");
    const legacy = normalizeTripExpense({ id: "old-1", item: " 午餐 ", type: "餐饮", amount: 88, by: "林" }, "actual");
    assert.deepEqual(legacy, { id: "old-1", title: "午餐", type: "餐饮", amount: 88, occurrence: "actual", payer: "林" });
    assert.deepEqual(createTripExpense({ id: "new-1", title: "地铁", type: "交通", amount: 5, occurrence: "actual", date: "2026-08-26", payer: "你", note: "机场线" }), { id: "new-1", title: "地铁", type: "交通", amount: 5, occurrence: "actual", date: "2026-08-26", payer: "你", note: "机场线" });
    assert.equal(normalizeTripExpense({ id: "bad", item: "", type: "餐饮", amount: 10 }, "actual"), null);
    assert.throws(() => createTripExpense({ title: "  ", type: "餐饮", amount: 10, occurrence: "actual" }));
    assert.throws(() => createTripExpense({ title: "午餐", type: "餐饮", amount: Number.NaN, occurrence: "actual" }));
  } finally { await compilation.cleanup(); }
});

test("budget and actual totals update from the shared expense model", async () => {
  const compilation = await compileTypeScript(sources, "ledger-totals-");
  try {
    const { getBudgetOverview } = await compilation.importModule("trip/budgetRules.js");
    const budget = [{ id: "b", title: "酒店", type: "住宿", amount: 300, occurrence: "estimated" }];
    const actual = [{ id: "a", title: "酒店", type: "住宿", amount: 280, occurrence: "actual", payer: "你" }];
    assert.deepEqual(getBudgetOverview(budget, actual), { plannedTotal: 300, actualTotal: 280, remaining: 20 });
    assert.deepEqual(getBudgetOverview([], []), { plannedTotal: 0, actualTotal: 0, remaining: 0 });
  } finally { await compilation.cleanup(); }
});
