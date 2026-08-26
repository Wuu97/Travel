import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("collaborators retain edit capability without inheriting owner-only capabilities", async () => {
  const [route, controller, workspace, travelApp] = await Promise.all([
    readFile(new URL("app/api/trips/route.ts", root), "utf8"),
    readFile(new URL("features/trip/hooks/useTripWorkspaceController.ts", root), "utf8"),
    readFile(new URL("features/trip/components/TripWorkspace.tsx", root), "utf8"),
    readFile(new URL("features/travel/components/TravelAppContent.tsx", root), "utf8"),
  ]);

  const collaborator = { canEditTrip: true, canManageMembers: false, canDeleteTrip: false };
  assert.deepEqual(collaborator, { canEditTrip: true, canManageMembers: false, canDeleteTrip: false });
  assert.match(route, /const canEdit = currentMember === "owner" \|\| currentMember === "editor"/);
  assert.match(route, /canDelete: trip\.owner_id === context\.userId, canEdit, canManage: trip\.owner_id === context\.userId/);
  assert.match(controller, /setCanManageMembers\(membership\.canManage\)/);
  assert.match(controller, /setCanDeleteTrip\(membership\.canDelete\)/);
  assert.match(controller, /canManageMembers,/);
  assert.match(controller, /canDeleteTrip,/);
  assert.match(workspace, /canManageMembers: props\.canManageMembers/);
  assert.match(workspace, /canDeleteTrip: props\.canDeleteTrip/);
  assert.match(travelApp, /canManageMembers: workspace\.workspaceProps\.canManageMembers/);
  assert.match(travelApp, /canDeleteTrip: workspace\.workspaceProps\.canDeleteTrip/);
  assert.doesNotMatch(travelApp, /canManageMembers: workspace\.workspaceProps\.canEditTrip/);
  assert.doesNotMatch(travelApp, /canDeleteTrip: workspace\.workspaceProps\.canEditTrip/);
});
