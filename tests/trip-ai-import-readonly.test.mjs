import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readComponent = (name) => readFile(new URL(`../features/${name}`, import.meta.url), "utf8");

test("AI import controls respect TripCapabilitiesContext without affecting response display", async () => {
  const [renderer, panel, richContent, action, app] = await Promise.all([
    readComponent("chat/components/TripImportRenderer.tsx"),
    readComponent("chat/components/ChatImportPanel.tsx"),
    readComponent("chat/components/AiRichContent.tsx"),
    readComponent("travel/components/ai/ItineraryActionButton.tsx"),
    readComponent("travel/components/TravelAppContent.tsx"),
  ]);

  assert.match(renderer, /const \{ canEditTrip \} = useTripCapabilities\(\)/);
  assert.match(renderer, /if \(canEditTrip\) onAddItineraries\(items\)/);
  assert.match(renderer, /if \(canEditTrip\) onAddExpenses\(items, destination\)/);
  assert.match(renderer, /StructuredTravelResponse/);
  assert.match(renderer, /AiRichContent/);

  assert.match(panel, /当前旅行为只读，无法导入到行程或账本。/);
  assert.equal((panel.match(/disabled=\{added \|\| !canEditTrip\}/g) ?? []).length, 4);
  assert.equal((panel.match(/disabled=\{!canEditTrip\}/g) ?? []).length, 3);
  assert.match(panel, /onToggleMany\(expenseItems\.map/);

  assert.match(richContent, /disabled=\{added \|\| !canEditTrip\}/);
  assert.match(action, /disabled=\{added \|\| !canEditTrip\}/);
  assert.match(app, /<AiAssistantSection/);
  assert.match(app, /TripCapabilitiesContext\.Provider/);
});
