const ITINERARY_TYPES = new Set([
  "景点",
  "餐饮",
  "活动",
  "交通",
  "住宿",
  "购物",
  "其他",
]);
const EXPENSE_TYPES = new Set(["住宿", "餐饮", "交通", "门票", "活动", "其他"]);
const MAX_TRIP_ITEMS = 500;
const MAX_TEXT_LENGTH = 2_000;

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const isShortString = (value: unknown, maxLength = MAX_TEXT_LENGTH) =>
  typeof value === "string" && value.length <= maxLength;

const isOptionalShortString = (value: unknown) =>
  value === undefined || isShortString(value);

const isItineraryItem = (value: unknown) => {
  if (!isRecord(value)) return false;
  return (
    isShortString(value.id, 200) &&
    isShortString(value.title) &&
    typeof value.type === "string" &&
    ITINERARY_TYPES.has(value.type) &&
    (value.day === undefined || (Number.isInteger(value.day) && value.day >= 1 && value.day <= 31)) &&
    isOptionalShortString(value.date) &&
    isOptionalShortString(value.time) &&
    isOptionalShortString(value.location) &&
    isOptionalShortString(value.note) &&
    isOptionalShortString(value.creator)
  );
};

const isExpenseItem = (value: unknown) => {
  if (!isRecord(value)) return false;
  return (
    isShortString(value.id, 200) &&
    isShortString(value.title ?? value.item) &&
    typeof value.type === "string" &&
    EXPENSE_TYPES.has(value.type) &&
    typeof value.amount === "number" &&
    Number.isFinite(value.amount) &&
    value.amount >= 0 &&
    isOptionalShortString(value.by) &&
    isOptionalShortString(value.occurrence) &&
    isOptionalShortString(value.relatedItineraryItemId) &&
    isOptionalShortString(value.relatedItineraryTitle) &&
    isOptionalShortString(value.note)
  );
};

export type StoredTrip = {
  expenses: unknown[];
  budgetItems: unknown[];
  plans: unknown[];
};

export function isStoredTrip(value: unknown): value is StoredTrip {
  if (!isRecord(value)) return false;
  const { expenses, budgetItems, plans } = value;
  return (
    Array.isArray(expenses) &&
    Array.isArray(budgetItems) &&
    Array.isArray(plans) &&
    expenses.length <= MAX_TRIP_ITEMS &&
    budgetItems.length <= MAX_TRIP_ITEMS &&
    plans.length <= MAX_TRIP_ITEMS &&
    expenses.every(isExpenseItem) &&
    budgetItems.every(isExpenseItem) &&
    plans.every(isItineraryItem)
  );
}

type ChatMessage = { role: "user" | "assistant"; content: string };

export type AiRequest = {
  message: string;
  context?: string;
  history: ChatMessage[];
};

export function parseAiRequest(value: unknown): AiRequest | null {
  if (!isRecord(value) || !isShortString(value.message) || !value.message.trim())
    return null;
  if (value.context !== undefined && !isShortString(value.context, 6_000))
    return null;
  if (value.history !== undefined && !Array.isArray(value.history)) return null;

  const history = value.history ?? [];
  if (
    history.length > 8 ||
    !history.every(
      (message) =>
        isRecord(message) &&
        (message.role === "user" || message.role === "assistant") &&
        isShortString(message.content, 4_000),
    )
  )
    return null;

  return {
    message: value.message.trim(),
    context: value.context,
    history: history as ChatMessage[],
  };
}