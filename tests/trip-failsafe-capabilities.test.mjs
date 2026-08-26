import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("shared trips stay fail-safe until current membership and cloud metadata are confirmed", async () => {
  const [controller, library] = await Promise.all([
    readFile(new URL("features/trip/hooks/useTripWorkspaceController.ts", root), "utf8"),
    readFile(new URL("features/trip/components/TripLibrary.tsx", root), "utf8"),
  ]);

  assert.match(controller, /const requiresMembershipResolution = Boolean\(accessToken && hasTripInUrl && tripId !== DEFAULT_TRIP_ID\)/);
  assert.equal((controller.match(/useState\(\(\) => !requiresMembershipResolution\)/g) ?? []).length, 3);
  assert.match(controller, /const membershipPending = Boolean\(accessToken && activeRealTripId\) && capabilityTripId !== activeRealTripId/);
  assert.match(controller, /const safeCanEditTrip = membershipPending \? false : canEditTrip/);
  assert.match(controller, /setCapabilityTripId\(activeRealTripId\)/);
  assert.match(controller, /catch\(\(\) => \{ setCanEditTrip\(false\); setCanManageMembers\(false\); setCanDeleteTrip\(false\); setCapabilityTripId\(null\); setPermissionStatus\("error"\); \}\)/);

  assert.match(library, /const \[cloudDeleteCapabilities, setCloudDeleteCapabilities\] = useState<Map<string, boolean>>/);
  assert.match(library, /setCloudDeleteCapabilities\(new Map\(cloudItems\.map\(\(item\) => \[item\.id, item\.canDelete === true\]\)\)\)/);
  assert.match(library, /setCloudDeleteCapabilities\(new Map\(\)\);/);
  assert.match(library, /cloudBacked: true, canDelete: undefined/);
  assert.match(library, /if \(cloudBacked && cloudCapability !== true\) return/);
  assert.match(library, /const canDeleteItem = !cloudBacked \|\| cloudCapability === true/);
  assert.doesNotMatch(library, /canDelete: true/);
  assert.doesNotMatch(library, /isActive && canDeleteTrip/);
});
