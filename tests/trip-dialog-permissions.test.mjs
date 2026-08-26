import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("open itinerary mutation dialogs close and refuse saves when editing permission is revoked", async () => {
  const [entryActions, editor, manual] = await Promise.all([
    readFile(new URL("features/trip/components/ItineraryEntryActions.tsx", root), "utf8"),
    readFile(new URL("features/trip/components/PlanEditorDialog.tsx", root), "utf8"),
    readFile(new URL("features/trip/components/ManualPlanDialog.tsx", root), "utf8"),
  ]);

  assert.equal((entryActions.match(/import \{ useTripCapabilities \} from "\.\/TripCapabilities";/g) ?? []).length, 1);
  for (const dialog of [editor, manual]) {
    assert.match(dialog, /const \{ canEditTrip \} = useTripCapabilities\(\)/);
    assert.match(dialog, /useEffect\(\(\) => \{ if \(plan && !canEditTrip\) onClose\(\); \}, \[canEditTrip, onClose, plan\]\)/);
    assert.match(dialog, /if \(!plan \|\| !canEditTrip\) return null;/);
  }
  assert.match(editor, /if \(canEditTrip\) onSave\(\)/);
  assert.match(manual, /if \(!canEditTrip\) return;/);
});
