export type PlaceInfo = {
  provider: "amap";
  rating?: number;
  averageCost?: number;
  openingHours?: string;
};

/** One canonical category vocabulary for itinerary and ledger records. */
export const tripCategories = ["景点", "餐饮", "交通", "住宿", "购物", "其他"] as const;
export type TripCategory = (typeof tripCategories)[number];
/** @deprecated Use tripCategories. Kept for source compatibility with itinerary UI. */
export const itineraryTypes = tripCategories;
export type ItineraryType = TripCategory;
export type ExpenseCategory = TripCategory;

const legacyCategoryMap: Record<string, TripCategory> = { 门票: "景点", 活动: "其他" };
export const normalizeTripCategory = (value: unknown): TripCategory | undefined => {
  if (typeof value !== "string") return undefined;
  return (tripCategories as readonly string[]).includes(value) ? value as TripCategory : legacyCategoryMap[value];
};
export const isTripCategory = (value: unknown): value is TripCategory => typeof value === "string" && (tripCategories as readonly string[]).includes(value);
export const isItineraryType = isTripCategory;

export type ItineraryItem = {
  id: string;
  title: string;
  type: ItineraryType;
  day?: number;
  date?: string;
  time?: string;
  location?: string;
  note?: string;
  creator?: string;
  place?: PlaceInfo;
};

export type ExpenseOccurrence = "estimated" | "actual";

/** Shared expense semantics, independent from whether a screen calls it a budget or ledger row. */
export type TripExpense = {
  id: string;
  title: string;
  amount: number;
  type: ExpenseCategory;
  occurrence: ExpenseOccurrence;
  relatedItineraryItemId?: string;
  relatedItineraryTitle?: string;
  date?: string;
  payer?: string;
  note?: string;
};

export type ExpenseItem = TripExpense;
/** @deprecated Kept as an alias so callers of the old ledger name remain source-compatible. */
export type LedgerItem = TripExpense;

export type StoredTrip = {
  /** Explicit trip-wide budget; null means the owner has not set one. */
  totalBudget: number | null;
  expenses: TripExpense[];
  budgetItems: TripExpense[];
  plans: ItineraryItem[];
  /** Present for shared trips; omitted by older local snapshots. */
  details?: TripDetails;
};

export type TripDetails = {
  title: string;
  status: "筹备中" | "进行中" | "已结束";
  startDate: string;
  endDate: string;
  companions: string[];
  memberRoles?: Record<string, "协作者" | "同行人">;
  coverImage?: string;
};

export type TripLibraryItem = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status?: TripDetails["status"];
  cloudBacked?: boolean;
  canDelete?: boolean;
};
