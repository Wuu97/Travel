import { env } from "cloudflare:workers";
import { AmapPlaceProvider } from "../../../features/places/amap";
import { isShortString } from "../../../features/shared/validation";

const MAX_QUERY_LENGTH = 100;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim();
  const city = url.searchParams.get("city")?.trim();
  if (!query || !isShortString(query, MAX_QUERY_LENGTH) || (city !== undefined && !isShortString(city, MAX_QUERY_LENGTH))) {
    return Response.json({ error: "地点查询参数无效。" }, { status: 400 });
  }

  const apiKey = env.AMAP_WEB_SERVICE_KEY?.trim();
  if (!apiKey) return Response.json({ result: null, provider: "unavailable" });

  try {
    const result = await new AmapPlaceProvider(apiKey).lookup(query, city || undefined);
    return Response.json(
      { result },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
    );
  } catch {
    return Response.json({ result: null, provider: "unavailable" }, { status: 503 });
  }
}
