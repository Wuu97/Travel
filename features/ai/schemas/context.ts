export type TravelContext = {
  city?: string;
  destination?: string;
  region?: string;
};

const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;

export function normalizeTravelContext(value: unknown): TravelContext | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const context = { city: text(raw.city), destination: text(raw.destination), region: text(raw.region) };
  return context.city || context.destination || context.region ? context : undefined;
}
