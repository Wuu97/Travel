import type { StoredTrip, TripDetails } from "./model";
import { sortItineraryItems } from "./utils";

const TRIP_STORAGE_KEY = "tuyu-local-trip";
const TRIP_DETAILS_STORAGE_KEY = "tuyu-trip-details";

export function loadStoredTrip(fallback: StoredTrip): StoredTrip {
  if (typeof window === "undefined") return fallback;
  try {
    const data = JSON.parse(localStorage.getItem(TRIP_STORAGE_KEY) || "{}") as Partial<StoredTrip>;
    return {
      expenses: Array.isArray(data.expenses) ? data.expenses.map((item) => ({ ...item, id: item.id || `expense-${item.item}-${item.amount}` })) : fallback.expenses,
      budgetItems: Array.isArray(data.budgetItems) ? data.budgetItems : fallback.budgetItems,
      plans: Array.isArray(data.plans)
        ? sortItineraryItems(data.plans.map((item, index) => typeof item === "string" ? { id: `legacy-plan-${index}-${item}`, title: item, type: ["交通", "餐饮", "景点"][index % 3] as StoredTrip["plans"][number]["type"], day: 1 } : item))
        : fallback.plans,
    };
  } catch {
    return fallback;
  }
}

export function loadTripDetails(fallback: TripDetails): TripDetails {
  if (typeof window === "undefined") return fallback;
  try {
    const value = JSON.parse(localStorage.getItem(TRIP_DETAILS_STORAGE_KEY) || "{}") as Partial<TripDetails>;
    const companions = Array.isArray(value.companions) && value.companions.every((name) => typeof name === "string") ? value.companions.filter(Boolean) : fallback.companions;
    const memberRoles = value.memberRoles && typeof value.memberRoles === "object"
      ? companions.reduce<Record<string, "编辑者" | "查看者">>((roles, companion) => {
          const role = value.memberRoles?.[companion];
          if (role === "编辑者" || role === "查看者") roles[companion] = role;
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

export function saveTrip(trip: StoredTrip) {
  localStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(trip));
}

export function saveTripDetails(details: TripDetails) {
  localStorage.setItem(TRIP_DETAILS_STORAGE_KEY, JSON.stringify(details));
}

export function clearTripStorage() {
  localStorage.removeItem(TRIP_STORAGE_KEY);
  localStorage.removeItem(TRIP_DETAILS_STORAGE_KEY);
}
