import type { RouteProvider } from "../types";
import type { RouteInput, TravelLocationRef, TravelRoute } from "../../tools/types";
import { AmapClient } from "../../../shared/amap/client";
import type { AmapRouteResponse } from "./types";

const routePaths = { driving: "/v5/direction/driving", walking: "/v5/direction/walking", cycling: "/v5/direction/bicycling" } as const;

function coordinates(location: TravelLocationRef): string {
  if (!Number.isFinite(location.longitude) || !Number.isFinite(location.latitude)) throw new Error("路线规划需要起点和终点坐标。");
  return `${location.longitude},${location.latitude}`;
}

function finiteNumber(value: unknown): number | undefined {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

export class AmapRouteProvider implements RouteProvider {
  constructor(private readonly client: AmapClient) {}

  async getRoute(input: RouteInput): Promise<TravelRoute | null> {
    const mode = input.mode ?? "driving";
    if (mode === "transit") throw new Error("高德公交路线规划需要额外城市上下文，当前 Provider 尚未支持。");
    const data = await this.client.request<AmapRouteResponse>(routePaths[mode], { origin: coordinates(input.from), destination: coordinates(input.to), ...(mode === "driving" ? { strategy: 32 } : {}), show_fields: "cost" });
    const path = data.route?.paths?.[0];
    if (!path) return null;
    const durationSeconds = finiteNumber(path.duration) ?? finiteNumber(path.cost?.duration);
    const distanceMeters = finiteNumber(path.distance);
    return { from: input.from, to: input.to, mode, ...(durationSeconds === undefined ? {} : { durationMinutes: Math.round(durationSeconds / 60) }), ...(distanceMeters === undefined ? {} : { distanceMeters }), source: { provider: "amap" } };
  }
}
