import assert from "node:assert/strict";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

test("账本搜索、AND 筛选与 CSV 导出使用完整费用数据", async () => {
  const compilation = await compileTypeScript(["features/trip/ledgerView.ts", "features/trip/model.ts"], "ledger-view-");
  try {
    const { defaultLedgerFilters, filterLedgerItems, ledgerCsv } = await compilation.importModule("ledgerView.js");
    const plans = [{ id: "p1", title: "西湖骑行", type: "景点", day: 1 }];
    const planned = [{ id: "b1", title: "民宿", amount: 500, type: "住宿", occurrence: "estimated", date: "2026-08-27", payer: "林", note: "含早餐", relatedItineraryItemId: "p1" }];
    const actual = [{ id: "a1", title: "午餐, \"特色\"", amount: 88, type: "餐饮", occurrence: "actual", date: "2026-08-26", payer: "你", note: "换行\n备注", relatedItineraryTitle: "西湖骑行" }];
    const undated = [{ id: "a2", title: "无日期餐饮", amount: 30, type: "餐饮", occurrence: "actual", payer: "你" }];
    assert.equal(filterLedgerItems(actual, "actual", { ...defaultLedgerFilters, query: "  你 " }, plans).length, 1);
    assert.equal(filterLedgerItems(planned, "estimated", { ...defaultLedgerFilters, query: "西湖" }, plans).length, 1);
    assert.equal(filterLedgerItems(actual, "actual", { ...defaultLedgerFilters, occurrence: "actual", category: "餐饮", startDate: "2026-08-26", endDate: "2026-08-26" }, plans).length, 1);
    assert.equal(filterLedgerItems(actual, "actual", { ...defaultLedgerFilters, occurrence: "actual", category: "住宿" }, plans).length, 0);
    assert.equal(filterLedgerItems(undated, "actual", defaultLedgerFilters, plans).length, 1);
    assert.equal(filterLedgerItems(undated, "actual", { ...defaultLedgerFilters, startDate: "2026-08-26" }, plans).length, 0);
    assert.equal(filterLedgerItems(undated, "actual", { ...defaultLedgerFilters, endDate: "2026-08-26" }, plans).length, 0);
    assert.equal(filterLedgerItems(undated, "actual", { ...defaultLedgerFilters, startDate: "2026-08-25", endDate: "2026-08-27" }, plans).length, 0);
    assert.equal(filterLedgerItems(actual, "actual", { ...defaultLedgerFilters, startDate: "2026-08-26", endDate: "2026-08-26", category: "餐饮", query: "午餐" }, plans).length, 1);
    const csv = ledgerCsv(planned, actual, plans);
    assert.ok(csv.startsWith("\uFEFF"));
    assert.match(csv, /"预计"/); assert.match(csv, /"实际"/); assert.match(csv, /"午餐, ""特色"""/); assert.match(csv, /"换行\n备注"/);
  } finally { await compilation.cleanup(); }
});
