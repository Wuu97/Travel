export type TravelContext = {
  city?: string;
  destination?: string;
  region?: string;
  trip?: {
    days?: number;
    startDate?: string;
    endDate?: string;
    travelers?: number;
    transportMode?: "self_drive" | "public_transport" | "mixed";
  };
};

const text = (value: unknown, maxLength = 200) =>
  typeof value === "string" && value.trim() && value.trim().length <= maxLength && !/\p{Cc}/u.test(value) ? value.trim() : undefined;
const positiveInteger = (value: unknown, maximum: number) => typeof value === "number" && Number.isInteger(value) && value > 0 && value <= maximum ? value : undefined;
const date = (value: unknown) => {
  const candidate = text(value, 10);
  if (!candidate || !/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(candidate)) return undefined;
  const parsed = new Date(`${candidate}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== candidate ? undefined : candidate;
};
const transportModes = ["self_drive", "public_transport", "mixed"] as const;
type TransportMode = NonNullable<TravelContext["trip"]>["transportMode"];
const transportMode = (value: unknown): TransportMode | undefined =>
  typeof value === "string" && (transportModes as readonly string[]).includes(value) ? value as TransportMode : undefined;

export function normalizeTravelContext(value: unknown): TravelContext | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const rawTrip = raw.trip && typeof raw.trip === "object" && !Array.isArray(raw.trip) ? raw.trip as Record<string, unknown> : undefined;
  const trip = rawTrip ? {
    days: positiveInteger(rawTrip.days, 365),
    startDate: date(rawTrip.startDate),
    endDate: date(rawTrip.endDate),
    travelers: positiveInteger(rawTrip.travelers, 100),
    transportMode: transportMode(rawTrip.transportMode),
  } : undefined;
  const context = {
    city: text(raw.city),
    destination: text(raw.destination),
    region: text(raw.region),
    ...(trip && (trip.days || trip.startDate || trip.endDate || trip.travelers || trip.transportMode) ? { trip } : {}),
  };
  return context.city || context.destination || context.region || context.trip ? context : undefined;
}

export function formatTravelContext(context: TravelContext | undefined): string | undefined {
  if (!context) return undefined;
  const lines = [
    context.destination ? `目的地：${context.destination}` : undefined,
    context.city && context.city !== context.destination ? `城市：${context.city}` : undefined,
    context.region ? `区域：${context.region}` : undefined,
    context.trip?.days ? `旅行天数：${context.trip.days}天` : undefined,
    context.trip?.startDate ? `出发日期：${context.trip.startDate}` : undefined,
    context.trip?.endDate ? `返程日期：${context.trip.endDate}` : undefined,
    context.trip?.travelers ? `同行人数：${context.trip.travelers}人` : undefined,
    context.trip?.transportMode ? `交通方式：${({ self_drive: "自驾", public_transport: "公共交通", mixed: "混合出行" } as const)[context.trip.transportMode]}` : undefined,
  ].filter((line): line is string => Boolean(line));
  return lines.length ? `当前旅行信息：\n${lines.map((line) => `- ${line}`).join("\n")}` : undefined;
}
