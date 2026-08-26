import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("cloud deletion is decided by each trip's owner capability, not the active trip", async () => {
  const [route, api, library, model] = await Promise.all([
    readFile(new URL("app/api/trips/route.ts", root), "utf8"),
    readFile(new URL("features/trip/api.ts", root), "utf8"),
    readFile(new URL("features/trip/components/TripLibrary.tsx", root), "utf8"),
    readFile(new URL("features/trip/model.ts", root), "utf8"),
  ]);

  const ownerTrips = [
    { id: "owner-a", cloudBacked: true, canDelete: true },
    { id: "owner-b", cloudBacked: true, canDelete: true },
  ];
  const collaboratorTrip = { id: "collaborator", cloudBacked: true, canDelete: false };
  const companionTrip = { id: "companion", cloudBacked: true, canDelete: false };
  const localTrip = { id: "local", cloudBacked: false, canDelete: undefined };
  assert.equal(ownerTrips.every((trip) => trip.canDelete), true);
  assert.equal(collaboratorTrip.canDelete || companionTrip.canDelete, false);
  assert.equal(localTrip.cloudBacked, false);

  assert.match(route, /select\("id, owner_id, payload"\)/);
  assert.match(route, /cloudBacked: true, canDelete: row\.owner_id === context\.userId/);
  assert.match(api, /\(trip as TripLibraryItem\)\.cloudBacked === true/);
  assert.match(api, /typeof \(trip as TripLibraryItem\)\.canDelete === "boolean"/);
  assert.match(model, /cloudBacked\?: boolean;/);
  assert.match(model, /canDelete\?: boolean;/);
  assert.match(library, /if \(cloudBacked && cloudCapability !== true\) return/);
  assert.match(library, /const canDeleteItem = !cloudBacked \|\| cloudCapability === true/);
  assert.match(library, /if \(cloudBacked && accessToken\) await deleteSharedTrip\(tripId, accessToken\)/);
  assert.doesNotMatch(library, /isActive && canDeleteTrip/);
});
