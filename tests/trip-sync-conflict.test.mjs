import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("共享旅行的版本冲突会保留完整本地快照并进入显式恢复状态", async () => {
  const [api, persistence, app] = await Promise.all([
    readFile(new URL("features/trip/api.ts", root), "utf8"),
    readFile(new URL("features/trip/hooks/useTripPersistence.ts", root), "utf8"),
    readFile(new URL("features/travel/components/TravelAppContent.tsx", root), "utf8"),
  ]);

  assert.match(api, /if \(response\.status === 409\) throw new TripVersionConflictError/);
  assert.match(api, /export class TripVersionConflictError extends Error/);
  assert.match(persistence, /const snapshot = useMemo\(\(\) => \(\{ expenses, budgetItems, plans, details \}\)/);
  assert.match(persistence, /setConflict\(\{ localSnapshot: snapshot, remoteSnapshot: normalizeSnapshot\(latest\.trip, detailsRef\.current\), remoteVersion: latest\.version \}\)/);
  assert.match(persistence, /if \(error instanceof TripVersionConflictError\) \{/);
  assert.match(persistence, /void loadSharedTrip\(tripId, accessToken\)/);
  assert.match(persistence, /conflict \|\| resolvingConflict \|\| conflictPendingRef\.current/);
  assert.match(app, /旅行已被其他成员更新。/);
  assert.match(app, /使用最新版本/);
  assert.match(app, /保留我的修改/);
});

test("冲突恢复可以采用云端快照，或按远端最新版本重试本地快照", async () => {
  const persistence = await readFile(new URL("features/trip/hooks/useTripPersistence.ts", root), "utf8");

  assert.match(persistence, /applySnapshot\(conflict\.remoteSnapshot\);/);
  assert.match(persistence, /setVersion\(conflict\.remoteVersion\);/);
  assert.match(persistence, /const retryLocalSnapshot = async \(\) => \{[\s\S]*?const localSnapshot = conflict\.localSnapshot;/);
  assert.doesNotMatch(persistence, /const retryLocalSnapshot = async \(\) => \{[\s\S]*?const localSnapshot = snapshot;/);
  assert.match(persistence, /const result = await saveSharedTrip\(tripId, localSnapshot, conflict\.remoteVersion, accessToken\);/);
  assert.match(persistence, /lastSavedRef\.current = JSON\.stringify\(localSnapshot\);/);
  assert.match(persistence, /setConflict\(\{ localSnapshot, remoteSnapshot: normalizeSnapshot\(latest\.trip, detailsRef\.current\), remoteVersion: latest\.version \}\);/);
  assert.match(persistence, /setConflict\(null\);/);
  assert.match(persistence, /else setSyncError\(error instanceof Error \? error\.message : "保存失败，请稍后重试。"\);/);
});
