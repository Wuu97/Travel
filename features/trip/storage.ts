import type { StoredTrip, TripDetails, TripLibraryItem } from "./model";
import { clampItineraryDays, sortItineraryItems } from "./utils";
import { normalizeTripExpense } from "./expense";

const TRIP_STORAGE_KEY = "tuyu-local-trip";
const TRIP_DETAILS_STORAGE_KEY = "tuyu-trip-details";
const TRIP_LIBRARY_STORAGE_KEY = "tuyu-trip-library";

const tripStorageKey = (tripId: string) => `${TRIP_STORAGE_KEY}:${tripId}`;
const tripDetailsStorageKey = (tripId: string) => `${TRIP_DETAILS_STORAGE_KEY}:${tripId}`;

export function loadStoredTrip(fallback: StoredTrip, tripId?: string): StoredTrip {
  if (typeof window === "undefined") return fallback;
  try {
    const key = tripId ? tripStorageKey(tripId) : TRIP_STORAGE_KEY;
    const storedValue = localStorage.getItem(key) || (!tripId ? localStorage.getItem(TRIP_STORAGE_KEY) : null) || "{}";
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

export function loadTripDetails(fallback: TripDetails, tripId?: string): TripDetails {
  if (typeof window === "undefined") return fallback;
  try {
    const key = tripId ? tripDetailsStorageKey(tripId) : TRIP_DETAILS_STORAGE_KEY;
    const storedValue = localStorage.getItem(key) || (!tripId ? localStorage.getItem(TRIP_DETAILS_STORAGE_KEY) : null) || "{}";
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

export function saveTrip(trip: StoredTrip, tripId?: string) {
  localStorage.setItem(tripId ? tripStorageKey(tripId) : TRIP_STORAGE_KEY, JSON.stringify(trip));
}

export function saveTripDetails(details: TripDetails, tripId?: string) {
  localStorage.setItem(tripId ? tripDetailsStorageKey(tripId) : TRIP_DETAILS_STORAGE_KEY, JSON.stringify(details));
}

export function loadTripLibrary(fallback: TripLibraryItem): TripLibraryItem[] {
  if (typeof window === "undefined") return [fallback];
  try {
    const storedValue = localStorage.getItem(TRIP_LIBRARY_STORAGE_KEY);
    if (storedValue !== null) {
      const items = JSON.parse(storedValue) as TripLibraryItem[];
      if (Array.isArray(items) && items.every((item) => item && typeof item.id === "string" && typeof item.title === "string")) return items;
    }
  } catch {
    // The default entry preserves the existing single-trip data after a malformed snapshot.
  }
  localStorage.setItem(TRIP_LIBRARY_STORAGE_KEY, JSON.stringify([fallback]));
  return [fallback];
}

export function saveTripLibrary(items: TripLibraryItem[]) {
  localStorage.setItem(TRIP_LIBRARY_STORAGE_KEY, JSON.stringify(items));
}

export function removeTripStorage(tripId: string) {
  localStorage.removeItem(tripStorageKey(tripId));
  localStorage.removeItem(tripDetailsStorageKey(tripId));
}

export function clearTripStorage() {
  localStorage.removeItem(TRIP_STORAGE_KEY);
  localStorage.removeItem(TRIP_DETAILS_STORAGE_KEY);
}
