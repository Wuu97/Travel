import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("structured renderer composes dedicated place, restaurant, route, and import components", async () => {
  const [renderer, place, restaurant, route, action] = await Promise.all([
    readFile(new URL("features/travel/components/ai/StructuredTravelResponse.tsx", root), "utf8"),
    readFile(new URL("features/travel/components/ai/TravelPlaceCard.tsx", root), "utf8"),
    readFile(new URL("features/travel/components/ai/TravelRestaurantCard.tsx", root), "utf8"),
    readFile(new URL("features/travel/components/ai/TravelRouteCard.tsx", root), "utf8"),
    readFile(new URL("features/travel/components/ai/ItineraryActionButton.tsx", root), "utf8"),
  ]);
  assert.match(renderer, /TravelPlaceCard/);
  assert.match(renderer, /TravelRestaurantCard/);
  assert.match(renderer, /TravelRouteCard/);
  assert.match(place, /card\.rating !== undefined/);
  assert.match(place, /card\.openingHours \?/);
  assert.match(restaurant, /card\.cuisine \?/);
  assert.match(route, /card\.duration \?/);
  assert.match(action, /onAddItineraries\(\[item\]\)/);
  assert.doesNotMatch(renderer, /card\.images/);
});

test("chat retains Markdown and falls back to the legacy rich renderer", async () => {
  const [messages, imports] = await Promise.all([
    readFile(new URL("features/chat/components/ChatMessageList.tsx", root), "utf8"),
    readFile(new URL("features/chat/components/TripImportRenderer.tsx", root), "utf8"),
  ]);
  assert.match(messages, /ReactMarkdown/);
  assert.match(imports, /message\.structuredTravelResponse/);
  assert.match(imports, /AiRichContent/);
});
