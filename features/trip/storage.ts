import type { StoredTrip, TripDetails, TripLibraryItem } from "./model";
import { clampItineraryDays, sortItineraryItems } from "./utils";
import { normalizeTripExpense } from "./expense";

const TRIP_STORAGE_KEY = "tuyu-local-trip";
const TRIP_DETAILS_STORAGE_KEY = "tuyu-trip-details";
const TRIP_LIBRARY_STORAGE_KEY = "tuyu-trip-library";

export type LocalStorageScope = string | null | undefined;

/** Keeps browser-only data isolated until it is explicitly associated with a signed-in user. */
export function getLocalStorageScope(userId?: LocalStorageScope) {
  return typeof userId === "string" && userId.trim() ? userId.trim() : "guest";
}

export const getTripSnapshotStorageKey = (tripId: string, userId?: LocalStorageScope) =>
  `${TRIP_STORAGE_KEY}:${getLocalStorageScope(userId)}:${tripId}`;
export const getTripDetailsStorageKey = (tripId: string, userId?: LocalStorageScope) =>
  `${TRIP_DETAILS_STORAGE_KEY}:${getLocalStorageScope(userId)}:${tripId}`;
export const getTripLibraryStorageKey = (userId?: LocalStorageScope) =>
  `${TRIP_LIBRARY_STORAGE_KEY}:${getLocalStorageScope(userId)}`;

export function hasStoredTripSnapshot(tripId: string, userId?: LocalStorageScope) {
  return typeof window !== "undefined" && localStorage.getItem(getTripSnapshotStorageKey(tripId, userId)) !== null;
}

export function hasStoredTripLibrary(userId?: LocalStorageScope) {
  if (typeof window === "undefined") return false;
  try {
    const storedValue = localStorage.getItem(getTripLibraryStorageKey(userId));
    if (storedValue === null) return false;
    const items = JSON.parse(storedValue) as TripLibraryItem[];
    return Array.isArray(items) && items.every((item) => item && typeof item.id === "string" && typeof item.title === "string");
  } catch {
    return false;
  }
}

export function loadStoredTrip(fallback: StoredTrip, tripId?: string, userId?: LocalStorageScope): StoredTrip {
  if (typeof window === "undefined") return fallback;
  try {
    const key = tripId ? getTripSnapshotStorageKey(tripId, userId) : `${TRIP_STORAGE_KEY}:${getLocalStorageScope(userId)}`;
    const storedValue = localStorage.getItem(key) || "{}";
    const data = JSON.parse(storedValue) as Partial<StoredTrip>;
    return {
      expenses: Array.isArray(data.expenses) ? data.expenses.map((item) => normalizeTripExpense(item as Record<string, unknown>, "actual")).filter((item): item is StoredTrip["expenses"][number] => item !== null) : fallback.expenses,
      budgetItems: Array.isArray(data.budgetItems) ? data.budgetItems.map((item) => normalizeTripExpense(item as Record<string, unknown>, "estimated")).filter((item): item is StoredTrip["budgetItems"][number] => item !== null) : fallback.budgetItems,
      plans: Array.isArray(data.plans)
        ? sortItineraryItems(clampItineraryDays(data.plans.map((item, index) => typeof item === "string" ? { id: `legacy-plan-${index}-${item}`, title: item, type: ["交通", "餐饮", "景点"][index % 3] as StoredTrip["plans"][number]["type"], day: 1 } : item)))
        : fallback.plans,
    };
  } catch {
    return fallback;
  }
}

export function loadTripDetails(fallback: TripDetails, tripId?: string, userId?: LocalStorageScope): TripDetails {
  if (typeof window === "undefined") return fallback;
  try {
    const key = tripId ? getTripDetailsStorageKey(tripId, userId) : `${TRIP_DETAILS_STORAGE_KEY}:${getLocalStorageScope(userId)}`;
    const storedValue = localStorage.getItem(key) || "{}";
    const value = JSON.parse(storedValue) as Partial<TripDetails>;
    const companions = Array.isArray(value.companions) && value.companions.every((name) => typeof name === "string") ? value.companions.filter(Boolean) : fallback.companions;
    const memberRoles = value.memberRoles && typeof value.memberRoles === "object"
      ? companions.reduce<Record<string, "协作者" | "同行人">>((roles, companion) => {
          const role = value.memberRoles?.[companion];
          if (role === "协作者") roles[companion] = "协作者";
          if (role === "同行人") roles[companion] = "同行人";
          return roles;
        }, {})
      : undefined;
    return {
      title: typeof value.title === "string" && value.title.trim() ? value.title : fallback.title,
      status: value.status === "筹备中" || value.status === "进行中" || value.status === "已结束" ? value.status : fallback.status,
      startDate: typeof value.startDate === "string" ? value.startDate : fallback.startDate,
      endDate: typeof value.endDate === "string" ? value.endDate : fallback.endDate,
      companions,
      memberRoles: memberRoles && Object.keys(memberRoles).length ? memberRoles : undefined,
      coverImage: typeof value.coverImage === "string" && value.coverImage.startsWith("data:image/") ? value.coverImage : undefined,
    };
  } catch {
    return fallback;
  }
}

export function saveTrip(trip: StoredTrip, tripId?: string, userId?: LocalStorageScope) {
  localStorage.setItem(tripId ? getTripSnapshotStorageKey(tripId, userId) : `${TRIP_STORAGE_KEY}:${getLocalStorageScope(userId)}`, JSON.stringify(trip));
}

export function saveTripDetails(details: TripDetails, tripId?: string, userId?: LocalStorageScope) {
  localStorage.setItem(tripId ? getTripDetailsStorageKey(tripId, userId) : `${TRIP_DETAILS_STORAGE_KEY}:${getLocalStorageScope(userId)}`, JSON.stringify(details));
}

export function loadTripLibrary(userId?: LocalStorageScope): TripLibraryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const storedValue = localStorage.getItem(getTripLibraryStorageKey(userId));
    if (storedValue !== null) {
      const items = JSON.parse(storedValue) as TripLibraryItem[];
      if (Array.isArray(items) && items.every((item) => item && typeof item.id === "string" && typeof item.title === "string")) return items;
    }
  } catch {
    // Treat malformed data as an empty library without overwriting it.
  }
  return [];
}

/** Keeps local-only trips while allowing authoritative cloud metadata to win by id. */
export function sortTripLibraryItems(items: TripLibraryItem[]) {
  const statusOrder: Record<NonNullable<TripLibraryItem["status"]>, number> = { "进行中": 0, "筹备中": 1, "已结束": 2 };
  return [...items].sort((first, second) => {
    const firstStatus = first.status || "筹备中";
    const secondStatus = second.status || "筹备中";
    const statusDifference = statusOrder[firstStatus] - statusOrder[secondStatus];
    if (statusDifference) return statusDifference;
    const dateDifference = firstStatus === "筹备中"
      ? first.startDate.localeCompare(second.startDate)
      : firstStatus === "已结束"
        ? second.endDate.localeCompare(first.endDate)
        : second.startDate.localeCompare(first.startDate);
    return dateDifference || first.id.localeCompare(second.id);
  });
}

export function mergeTripLibraryItems(localItems: TripLibraryItem[], cloudItems: TripLibraryItem[]) {
  const cloudById = new Map(cloudItems.map((item) => [item.id, item]));
  const localIds = new Set(localItems.map((item) => item.id));
  return sortTripLibraryItems([
    ...localItems.map((item) => cloudById.get(item.id) || item),
    ...cloudItems.filter((item) => !localIds.has(item.id)),
  ]);
}

export function resolveInitialTripId(items: TripLibraryItem[], requestedTripId: string | null, fallbackTripId: string) {
  if (requestedTripId && items.some((item) => item.id === requestedTripId)) return requestedTripId;
  return items[0]?.id || fallbackTripId;
}

export function saveTripLibrary(items: TripLibraryItem[], userId?: LocalStorageScope) {
  localStorage.setItem(getTripLibraryStorageKey(userId), JSON.stringify(items));
}

export function removeTripStorage(tripId: string, userId?: LocalStorageScope) {
  localStorage.removeItem(getTripSnapshotStorageKey(tripId, userId));
  localStorage.removeItem(getTripDetailsStorageKey(tripId, userId));
}

export function clearTripStorage(tripId?: string, userId?: LocalStorageScope) {
  if (tripId) {
    removeTripStorage(tripId, userId);
    return;
  }
  localStorage.removeItem(`${TRIP_STORAGE_KEY}:${getLocalStorageScope(userId)}`);
  localStorage.removeItem(`${TRIP_DETAILS_STORAGE_KEY}:${getLocalStorageScope(userId)}`);
}
