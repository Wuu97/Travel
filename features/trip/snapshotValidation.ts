import { isOptionalShortString, isRecord, isShortString } from "../shared/validation";

const ITINERARY_TYPES = new Set(["景点", "餐饮", "活动", "交通", "住宿", "购物", "其他"]);
const EXPENSE_TYPES = new Set(["住宿", "餐饮", "交通", "门票", "活动", "其他"]);
const MAX_TRIP_ITEMS = 500;

const isPlaceInfo = (value: unknown) => value === undefined || (isRecord(value) && value.provider === "amap" && (value.rating === undefined || (typeof value.rating === "number" && Number.isFinite(value.rating) && value.rating >= 0 && value.rating <= 5)) && (value.averageCost === undefined || (typeof value.averageCost === "number" && Number.isFinite(value.averageCost) && value.averageCost >= 0 && value.averageCost <= 1_000_000)) && isOptionalShortString(value.openingHours));
const isItineraryItem = (value: unknown) => isRecord(value) && isShortString(value.id, 200) && isShortString(value.title) && typeof value.type === "string" && ITINERARY_TYPES.has(value.type) && (value.day === undefined || (typeof value.day === "number" && Number.isInteger(value.day) && value.day >= 0 && value.day <= 31)) && isOptionalShortString(value.date) && isOptionalShortString(value.time) && isOptionalShortString(value.location) && isOptionalShortString(value.note) && isOptionalShortString(value.creator) && isPlaceInfo(value.place);
const isExpenseItem = (value: unknown) => isRecord(value) && isShortString(value.id, 200) && isShortString(value.title ?? value.item) && typeof value.type === "string" && EXPENSE_TYPES.has(value.type) && typeof value.amount === "number" && Number.isFinite(value.amount) && value.amount >= 0 && isOptionalShortString(value.by) && isOptionalShortString(value.payer) && isOptionalShortString(value.date) && isOptionalShortString(value.occurrence) && isOptionalShortString(value.relatedItineraryItemId) && isOptionalShortString(value.relatedItineraryTitle) && isOptionalShortString(value.note);
const isTripDetails = (value: unknown) => {
  if (!isRecord(value)) return false;
  const roles = value.memberRoles;
  return isShortString(value.title) && (value.status === "筹备中" || value.status === "进行中" || value.status === "已结束") && isShortString(value.startDate, 32) && isShortString(value.endDate, 32) && Array.isArray(value.companions) && value.companions.length <= 100 && value.companions.every((name) => isShortString(name, 100)) && (roles === undefined || (isRecord(roles) && Object.values(roles).every((role) => role === "协作者" || role === "同行人" || role === "编辑者" || role === "查看者"))) && (value.coverImage === undefined || isShortString(value.coverImage, 3_000_000));
};

export type StoredTripPayload = { expenses: unknown[]; budgetItems: unknown[]; plans: unknown[] };

export function isStoredTrip(value: unknown): value is StoredTripPayload {
  if (!isRecord(value)) return false;
  const { expenses, budgetItems, plans } = value;
  return Array.isArray(expenses) && Array.isArray(budgetItems) && Array.isArray(plans) && expenses.length <= MAX_TRIP_ITEMS && budgetItems.length <= MAX_TRIP_ITEMS && plans.length <= MAX_TRIP_ITEMS && expenses.every(isExpenseItem) && budgetItems.every(isExpenseItem) && plans.every(isItineraryItem) && (value.details === undefined || isTripDetails(value.details));
}
