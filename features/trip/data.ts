import type { ItineraryItem, StoredTrip, TripDetails, TripExpense } from "./model";

export const itineraryTypes = ["交通", "餐饮", "景点", "住宿", "购物", "活动", "其他"] as const;

const defaultExpenses: TripExpense[] = [
  { id: "expense-stay", title: "民宿 · 西湖边", type: "住宿", amount: 628, occurrence: "actual", payer: "林" },
  { id: "expense-lunch", title: "知味观午餐", type: "餐饮", amount: 168, occurrence: "actual", payer: "你", relatedItineraryItemId: "plan-lunch", relatedItineraryTitle: "知味观 · 午餐" },
  { id: "expense-train", title: "杭州东 → 上海虹桥", type: "交通", amount: 292, occurrence: "actual", payer: "安" },
];

const defaultPlans: ItineraryItem[] = [
  { id: "plan-arrival", title: "抵达杭州东站", type: "交通", time: "09:30", day: 1, creator: "你" },
  { id: "plan-lunch", title: "知味观 · 午餐", type: "餐饮", time: "11:30", day: 1, creator: "林", place: { provider: "amap", rating: 4.6, averageCost: 68, openingHours: "07:00-20:30" } },
  { id: "plan-bike", title: "西湖边骑行", type: "景点", time: "14:30", day: 1, creator: "AI" },
  { id: "plan-dinner", title: "南京大牌档 · 晚餐", type: "餐饮", time: "18:30", day: 1, creator: "你", place: { provider: "amap", rating: 4.4, averageCost: 96, openingHours: "10:30-14:00, 16:30-21:30" } },
];

export const defaultTripDetails: TripDetails = {
  title: "杭州 · 夏末两日",
  status: "进行中",
  startDate: "2026-08-16",
  endDate: "2026-08-18",
  companions: ["你", "林", "安"],
  memberRoles: { "林": "协作者", "安": "协作者" },
};

export const statusTagColors: Record<TripDetails["status"], { background: string; color: string }> = {
  筹备中: { background: "#fff1dc", color: "#a86522" },
  进行中: { background: "#e5f4ea", color: "#337b50" },
  已结束: { background: "#e9edf0", color: "#65727a" },
};

export const getDefaultStoredTrip = (): StoredTrip => ({
  totalBudget: null,
  expenses: defaultExpenses,
  budgetItems: [],
  plans: defaultPlans,
});
