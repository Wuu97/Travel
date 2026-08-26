import type { ExpenseItem, ItineraryItem, LedgerItem } from "./model";

export type LedgerFilters = { query: string; occurrence: "all" | "estimated" | "actual"; category: "all" | ExpenseItem["type"]; startDate: string; endDate: string };
export const defaultLedgerFilters: LedgerFilters = { query: "", occurrence: "all", category: "all", startDate: "", endDate: "" };

const normalized = (value?: string) => value?.trim().toLocaleLowerCase() || "";
const relatedTitle = (item: ExpenseItem | LedgerItem, plans: ItineraryItem[]) => item.relatedItineraryTitle || plans.find((plan) => plan.id === item.relatedItineraryItemId)?.title || "";

export function filterLedgerItems<T extends ExpenseItem | LedgerItem>(items: T[], occurrence: "estimated" | "actual", filters: LedgerFilters, plans: ItineraryItem[]) {
  const query = normalized(filters.query);
  const hasDateFilter = Boolean(filters.startDate || filters.endDate);
  return items.filter((item) => (filters.occurrence === "all" || filters.occurrence === occurrence)
    && (filters.category === "all" || item.type === filters.category)
    && (!hasDateFilter || Boolean(item.date))
    && (!filters.startDate || (item.date && item.date >= filters.startDate))
    && (!filters.endDate || (item.date && item.date <= filters.endDate))
    && (!query || [item.title, item.note, item.payer, relatedTitle(item, plans)].some((value) => normalized(value).includes(query))));
}

const csvCell = (value: string | number | undefined) => `"${String(value ?? "").replaceAll('"', '""')}"`;
export function ledgerCsv(budgetItems: ExpenseItem[], expenses: LedgerItem[], plans: ItineraryItem[]) {
  const rows = ["类型,名称,金额,分类,日期,付款人,备注,关联行程", ...[
    ...budgetItems.map((item) => ["预计", item.title, item.amount, item.type, item.date, item.payer, item.note, relatedTitle(item, plans)]),
    ...expenses.map((item) => ["实际", item.title, item.amount, item.type, item.date, item.payer, item.note, relatedTitle(item, plans)]),
  ].map((row) => row.map(csvCell).join(","))];
  return `\uFEFF${rows.join("\r\n")}`;
}
