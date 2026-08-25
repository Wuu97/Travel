export const travelPaces = ["relaxed", "balanced", "intensive"] as const;
export const transportPreferences = ["self_drive", "public_transport", "mixed"] as const;
export const budgetLevels = ["budget", "mid", "premium"] as const;
export const travelMemorySources = ["explicit", "inferred"] as const;

export type TravelPace = (typeof travelPaces)[number];
export type TransportPreference = (typeof transportPreferences)[number];
export type BudgetLevel = (typeof budgetLevels)[number];
export type TravelMemorySource = (typeof travelMemorySources)[number];

export type TravelPreference = {
  pace?: TravelPace;
  transportPreference?: TransportPreference;
  budgetLevel?: BudgetLevel;
  interests?: string[];
  dislikes?: string[];
};

export type TravelMemory = {
  id: string;
  userId: string;
  preference: TravelPreference;
  confidence: number;
  source: TravelMemorySource;
  createdAt: string;
  updatedAt: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const text = (value: unknown, maximum = 100) => typeof value === "string" && value.trim() && value.trim().length <= maximum && !/\p{Cc}/u.test(value) ? value.trim() : undefined;
const enumValue = <Value extends string>(value: unknown, values: readonly Value[]) => typeof value === "string" && values.includes(value as Value) ? value as Value : undefined;
const confidence = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1 ? value : undefined;
const timestamp = (value: unknown) => {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return undefined;
  return value;
};

function preferenceList(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 20) return undefined;
  const items = value.map((item) => text(item)).filter((item): item is string => Boolean(item));
  return items.length === value.length ? [...new Set(items)] : undefined;
}

export function normalizeTravelPreference(value: unknown): TravelPreference | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const pace = enumValue(raw.pace, travelPaces);
  const transportPreference = enumValue(raw.transportPreference, transportPreferences);
  const budgetLevel = enumValue(raw.budgetLevel, budgetLevels);
  const interests = preferenceList(raw.interests);
  const dislikes = preferenceList(raw.dislikes);
  if ((raw.pace !== undefined && !pace) || (raw.transportPreference !== undefined && !transportPreference) || (raw.budgetLevel !== undefined && !budgetLevel) || (raw.interests !== undefined && !interests) || (raw.dislikes !== undefined && !dislikes)) return undefined;
  return {
    pace,
    transportPreference,
    budgetLevel,
    ...(interests?.length ? { interests } : {}),
    ...(dislikes?.length ? { dislikes } : {}),
  };
}

export function normalizeTravelMemory(value: unknown): TravelMemory | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const raw = value as Record<string, unknown>;
  const preference = normalizeTravelPreference(raw.preference);
  const parsedConfidence = confidence(raw.confidence);
  const source = enumValue(raw.source, travelMemorySources);
  const id = text(raw.id, 36);
  const userId = text(raw.userId, 36);
  const createdAt = timestamp(raw.createdAt);
  const updatedAt = timestamp(raw.updatedAt);
  return id && UUID.test(id) && userId && UUID.test(userId) && preference && parsedConfidence !== undefined && source && createdAt && updatedAt
    ? { id, userId, preference, confidence: parsedConfidence, source, createdAt, updatedAt }
    : undefined;
}
