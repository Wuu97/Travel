import { normalizeRichContent, type RichContent } from "../../chat/model";
import type { TravelPlace, TravelRestaurant, TravelRoute } from "../tools/types";
import type { AiReply } from "../schemas/response";
import { travelPlaceToRichPlace, type PlaceRecommendationMeta } from "./places";
import { travelRestaurantToRichRestaurant, type RestaurantRecommendationMeta } from "./restaurants";
import { travelRouteToRichRoute, type RouteRecommendationMeta } from "./routes";

export type TravelDataForRichContent = {
  places?: TravelPlace[];
  restaurants?: TravelRestaurant[];
  routes?: TravelRoute[];
  placeMetaById?: Record<string, PlaceRecommendationMeta>;
  restaurantMetaById?: Record<string, RestaurantRecommendationMeta>;
  routeMetaByKey?: Record<string, RouteRecommendationMeta>;
};

const routeKey = (route: TravelRoute) => `${route.from.name}|${route.to.name}|${route.mode ?? ""}`;

export function buildRichContentFromTravelData(data: TravelDataForRichContent): RichContent | undefined {
  return normalizeRichContent({
    places: data.places?.flatMap((place) => {
      const richPlace = travelPlaceToRichPlace(place, data.placeMetaById?.[place.id]);
      return richPlace ? [richPlace] : [];
    }),
    restaurants: data.restaurants?.flatMap((restaurant) => {
      const richRestaurant = travelRestaurantToRichRestaurant(restaurant, data.restaurantMetaById?.[restaurant.id]);
      return richRestaurant ? [richRestaurant] : [];
    }),
    routes: data.routes?.flatMap((route) => {
      const richRoute = travelRouteToRichRoute(route, data.routeMetaByKey?.[routeKey(route)]);
      return richRoute ? [richRoute] : [];
    }),
  });
}

/** Inserts deterministic tool results ahead of model-authored candidates. */
export function mergeExecutedTravelData(reply: AiReply, data: TravelDataForRichContent): AiReply {
  const executed = buildRichContentFromTravelData(data);
  if (!executed) return reply;
  const existing = normalizeRichContent(reply.richContent);
  return {
    ...reply,
    richContent: normalizeRichContent({
      ...(existing ?? {}),
      ...(executed.places ? { places: [...executed.places, ...(existing?.places ?? [])] } : {}),
      ...(executed.restaurants ? { restaurants: [...executed.restaurants, ...(existing?.restaurants ?? [])] } : {}),
      ...(executed.routes ? { routes: [...executed.routes, ...(existing?.routes ?? [])] } : {}),
    }),
  };
}
