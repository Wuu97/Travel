import type { ItineraryItem, LedgerItem, StoredTrip, TripDetails } from "./model";

export const itineraryTypes = ["交通", "餐饮", "景点", "住宿", "购物", "活动", "其他"] as const;

const defaultExpenses: LedgerItem[] = [
  { id: "expense-stay", item: "民宿 · 西湖边", type: "住宿", amount: 628, by: "林" },
  { id: "expense-lunch", item: "知味观午餐", type: "餐饮", amount: 168, by: "你", relatedItineraryItemId: "plan-lunch", relatedItineraryTitle: "知味观 · 午餐" },
  { id: "expense-train", item: "杭州东 → 上海虹桥", type: "交通", amount: 292, by: "安" },
];

const defaultPlans: ItineraryItem[] = [
  { id: "plan-arrival", title: "抵达杭州东站", type: "交通", time: "09:30", day: 1, creator: "你" },
  { id: "plan-lunch", title: "知味观 · 午餐", type: "餐饮", time: "11:30", day: 1, creator: "林" },
  { id: "plan-bike", title: "西湖边骑行", type: "景点", time: "14:30", day: 1, creator: "AI" },
];

export const defaultTripDetails: TripDetails = {
  title: "杭州 · 夏末两日",
  status: "进行中",
  startDate: "2026-08-16",
  endDate: "2026-08-18",
  companions: ["你", "林", "安"],
};

export const statusTagColors: Record<TripDetails["status"], { background: string; color: string }> = {
  筹备中: { background: "#fff1dc", color: "#a86522" },
  进行中: { background: "#e5f4ea", color: "#337b50" },
  已结束: { background: "#e9edf0", color: "#65727a" },
};

export const getDefaultStoredTrip = (): StoredTrip => ({
  expenses: defaultExpenses,
  budgetItems: [],
  plans: defaultPlans,
});
