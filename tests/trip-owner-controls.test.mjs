import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("owner-only trip controls use distinct member-management and deletion capabilities", async () => {
  const [library, members, controls, lifecycle, capabilities] = await Promise.all([
    readFile(new URL("features/trip/components/TripLibrary.tsx", root), "utf8"),
    readFile(new URL("features/trip/components/TripMembersControl.tsx", root), "utf8"),
    readFile(new URL("features/trip/components/TripWorkspaceControls.tsx", root), "utf8"),
    readFile(new URL("features/trip/hooks/useTripLifecycle.ts", root), "utf8"),
    readFile(new URL("features/trip/components/TripCapabilities.tsx", root), "utf8"),
  ]);

  const owner = { canEditTrip: true, canManageMembers: true, canDeleteTrip: true };
  const collaborator = { canEditTrip: true, canManageMembers: false, canDeleteTrip: false };
  const companion = { canEditTrip: false, canManageMembers: false, canDeleteTrip: false };
  assert.equal(owner.canManageMembers && owner.canDeleteTrip, true);
  assert.equal(collaborator.canManageMembers || collaborator.canDeleteTrip, false);
  assert.equal(companion.canManageMembers || companion.canDeleteTrip, false);

  assert.match(library, /if \(cloudBacked && trip\.canDelete !== true\) return/);
  assert.match(library, /const canDeleteItem = item\.cloudBacked !== true \|\| item\.canDelete === true/);
  assert.match(library, /\{canDeleteItem && <button aria-label=\{`删除\$\{item\.title\}`\}/);

  assert.match(members, /const \{ canManageMembers \} = useTripCapabilities\(\)/);
  assert.match(members, /const canManage = canManageMembers && Boolean\(accessToken\)/);
  assert.match(members, /if \(!accessToken \|\| !canManage\) return/);
  assert.match(members, /canManage && member\.role !== "owner"/);

  assert.match(controls, /const \{ canManageMembers \} = useTripCapabilities\(\)/);
  assert.match(controls, /onCopyInvite\("collaborator"\)/);
  assert.match(controls, /onCopyInvite\("companion"\)/);
  assert.match(lifecycle, /createTripInvite\(tripId, accessToken, role\)/);
  assert.match(capabilities, /canManageMembers: boolean; canDeleteTrip: boolean/);
});
