import type { RouteProvider } from "../providers/types";
import type { RouteInput, TravelRoute } from "./types";

export function getTravelRoute(provider: RouteProvider, input: RouteInput): Promise<TravelRoute | null> {
  return provider.getRoute(input);
}
