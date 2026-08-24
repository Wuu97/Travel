export type PlaceInfo = {
  provider: "amap";
  rating?: number;
  averageCost?: number;
  openingHours?: string;
};

export const itineraryTypes = ["景点", "餐饮", "活动", "交通", "住宿", "购物", "其他"] as const;
export type ItineraryType = (typeof itineraryTypes)[number];
export const isItineraryType = (value: unknown): value is ItineraryType => typeof value === "string" && (itineraryTypes as readonly string[]).includes(value);

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

export type ExpenseCategory = "住宿" | "餐饮" | "交通" | "门票" | "活动" | "其他";
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
  note?: string;
};

export type ExpenseItem = TripExpense;

export type LedgerItem = {
  id: string;
  item: string;
  type: ExpenseCategory;
  amount: number;
  by: string;
  relatedItineraryItemId?: string;
  relatedItineraryTitle?: string;
};

export type StoredTrip = {
  expenses: LedgerItem[];
  budgetItems: ExpenseItem[];
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
};
