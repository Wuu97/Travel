import type { RichRoute } from "../../chat/model";
import type { ItineraryItem } from "../../trip/model";
import type { TravelRoute, TravelRouteMode } from "../tools/types";

export type RouteRecommendationMeta = { itineraryItem?: ItineraryItem };

const modeLabels: Record<TravelRouteMode, string> = { driving: "驾车", walking: "步行", transit: "公共交通", cycling: "骑行" };
const text = (value: string | undefined) => value?.trim() || undefined;

function formatDuration(minutes: number | undefined): string | undefined {
  if (!Number.isFinite(minutes) || minutes! < 0) return undefined;
  const rounded = Math.round(minutes!);
  return rounded < 60 ? `${rounded} 分钟` : `${Math.floor(rounded / 60)} 小时${rounded % 60 ? ` ${rounded % 60} 分钟` : ""}`;
}

function formatDistance(meters: number | undefined): string | undefined {
  if (!Number.isFinite(meters) || meters! < 0) return undefined;
  const rounded = Math.round(meters!);
  return rounded < 1_000 ? `${rounded} m` : `${Math.round((rounded / 1_000) * 10) / 10} km`;
}

export function travelRouteToRichRoute(route: TravelRoute, meta: RouteRecommendationMeta = {}): RichRoute | null {
  const from = text(route.from.name);
  const to = text(route.to.name);
  if (!from || !to) return null;
  return {
    from, to,
    ...(route.mode ? { mode: modeLabels[route.mode] } : {}),
    ...(formatDuration(route.durationMinutes) ? { duration: formatDuration(route.durationMinutes) } : {}),
    ...(formatDistance(route.distanceMeters) ? { distance: formatDistance(route.distanceMeters) } : {}),
    ...(text(route.costText) ? { cost: text(route.costText) } : {}),
    ...(text(route.description) ? { description: text(route.description) } : {}),
    ...(meta.itineraryItem ? { itineraryItem: meta.itineraryItem } : {}),
  };
}
