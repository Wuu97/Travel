import { AmapClient } from "./client";
import { AmapPlaceProvider } from "./places";
import { AmapRestaurantProvider } from "./restaurants";
import { AmapRouteProvider } from "./routes";

export function createAmapProviders(apiKey = process.env.AMAP_WEB_SERVICE_KEY?.trim()) {
  if (!apiKey) throw new Error("未配置高德地图 Web Service Key。");
  const client = new AmapClient(apiKey);
  return {
    amapPlaceProvider: new AmapPlaceProvider(client),
    amapRestaurantProvider: new AmapRestaurantProvider(client),
    amapRouteProvider: new AmapRouteProvider(client),
  };
}

export { AmapClient } from "./client";
export { mapAmapPoiToTravelPlace, mapAmapPoiToTravelRestaurant } from "./mapper";
