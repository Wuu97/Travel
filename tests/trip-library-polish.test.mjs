import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compileTypeScript } from "./helpers/compile-typescript.mjs";

const root = new URL("../", import.meta.url);

test("旅行库按状态与日期展示排序，云端合并也复用该排序", async () => {
  const storage = await readFile(new URL("features/trip/storage.ts", root), "utf8");
  assert.match(storage, /"进行中": 0, "筹备中": 1, "已结束": 2/);
  assert.match(storage, /firstStatus === "筹备中"[\s\S]*?first\.startDate\.localeCompare\(second\.startDate\)/);
  assert.match(storage, /firstStatus === "已结束"[\s\S]*?second\.endDate\.localeCompare\(first\.endDate\)/);
  assert.match(storage, /dayDistance\(first\.startDate\) - dayDistance\(second\.startDate\)/);
  assert.match(storage, /return sortTripLibraryItems\(\[/);
});

test("进行中旅行按距固定参考日期最近的出发日排序", async () => {
  const compilation = await compileTypeScript(["features/trip/storage.ts", "features/trip/model.ts", "features/trip/utils.ts", "features/trip/expense.ts"], "trip-library-sort-");
  try {
    const { sortTripLibraryItems } = await compilation.importModule("trip/storage.js");
    const trips = [
      { id: "running-old", title: "较早", startDate: "2026-08-10", endDate: "2026-08-28", status: "进行中" },
      { id: "running-near", title: "最近", startDate: "2026-08-25", endDate: "2026-08-28", status: "进行中" },
      { id: "planned-later", title: "稍后", startDate: "2026-09-10", endDate: "2026-09-12", status: "筹备中" },
      { id: "planned-sooner", title: "更早", startDate: "2026-09-01", endDate: "2026-09-03", status: "筹备中" },
      { id: "ended-old", title: "较早结束", startDate: "2026-07-01", endDate: "2026-07-03", status: "已结束" },
      { id: "ended-recent", title: "最近结束", startDate: "2026-08-01", endDate: "2026-08-20", status: "已结束" },
    ];
    assert.deepEqual(sortTripLibraryItems(trips, new Date("2026-08-26T12:00:00Z")).map((trip) => trip.id), ["running-near", "running-old", "planned-sooner", "planned-later", "ended-recent", "ended-old"]);
  } finally { await compilation.cleanup(); }
});

test("空旅行库不把杭州 fixture 当成真实旅行，排序不会改变当前选择", async () => {
  const library = await readFile(new URL("features/trip/components/TripLibrary.tsx", root), "utf8");
  assert.match(library, /还没有旅行，创建你的第一段旅程吧。/);
  assert.match(library, /const loadedItems = sortTripLibraryItems\(libraryItems\);/);
  assert.match(library, /const mergedItems = mergeTripLibraryItems\(current, cloudItems\);/);
  assert.match(library, /const retryCloudList[\s\S]*?void loadCloudTrips\(\);/);
  assert.doesNotMatch(library.slice(library.indexOf("const loadCloudTrips"), library.indexOf("useEffect(() => {", library.indexOf("const loadCloudTrips"))), /setActiveTripId|replaceState|tuyu-tripchange/);
});
