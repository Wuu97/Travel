import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("旅行库按状态与日期展示排序，云端合并也复用该排序", async () => {
  const storage = await readFile(new URL("features/trip/storage.ts", root), "utf8");
  assert.match(storage, /"进行中": 0, "筹备中": 1, "已结束": 2/);
  assert.match(storage, /firstStatus === "筹备中"[\s\S]*?first\.startDate\.localeCompare\(second\.startDate\)/);
  assert.match(storage, /firstStatus === "已结束"[\s\S]*?second\.endDate\.localeCompare\(first\.endDate\)/);
  assert.match(storage, /second\.startDate\.localeCompare\(first\.startDate\)/);
  assert.match(storage, /return sortTripLibraryItems\(\[/);
});

test("空旅行库不把杭州 fixture 当成真实旅行，排序不会改变当前选择", async () => {
  const library = await readFile(new URL("features/trip/components/TripLibrary.tsx", root), "utf8");
  assert.match(library, /还没有旅行，创建你的第一段旅程吧。/);
  assert.match(library, /const loadedItems = sortTripLibraryItems\(libraryItems\);/);
  assert.match(library, /const mergedItems = mergeTripLibraryItems\(current, cloudItems\);/);
  assert.match(library, /const retryCloudList[\s\S]*?void loadCloudTrips\(\);/);
  assert.doesNotMatch(library.slice(library.indexOf("const loadCloudTrips"), library.indexOf("useEffect(() => {", library.indexOf("const loadCloudTrips"))), /setActiveTripId|replaceState|tuyu-tripchange/);
});
