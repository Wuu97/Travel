import type { ExpenseItem, ItineraryItem, LedgerItem, TripDetails } from "../model";
import { getBudgetOverview } from "../budgetRules";
import { typeColors } from "../utils";

type Props = {
  budgetItems: ExpenseItem[];
  days: Array<{ day: number; date: string }>;
  details: TripDetails;
  expenses: LedgerItem[];
  plans: ItineraryItem[];
};

const money = (amount: number) => `¥ ${amount.toFixed(0)}`;

export function TripPrintExport({ budgetItems, days, details, expenses, plans }: Props) {
  const { plannedTotal } = getBudgetOverview(budgetItems, expenses);
  const actualTotal = expenses.reduce((total, item) => total + item.amount, 0);
  const remaining = plannedTotal - actualTotal;

  return <article className="trip-print-export">
    <header>
      <p>{details.status}</p>
      <h1>{details.title}</h1>
      <span>{details.startDate.replaceAll("-", ".")} - {details.endDate.replaceAll("-", ".")} · {details.companions.length} 位同行人</span>
    </header>
    <section>
      <h2>攻略</h2>
      {days.map((day) => {
        const dayPlans = plans.filter((plan) => (plan.day || 1) === day.day).sort((first, second) => (first.time || "").localeCompare(second.time || ""));
        return <article className="trip-print-day" key={day.day}>
          <h3>DAY {day.day}<small>{day.date.replaceAll("-", ".")}</small></h3>
          {dayPlans.length ? <ol>{dayPlans.map((plan) => <li key={plan.id}><time>{plan.time || "待定"}</time><div><strong>{plan.title}</strong><div className="trip-print-route-meta"><span className="trip-print-type" style={{ color: typeColors[plan.type].color, background: typeColors[plan.type].tint }}>{plan.type}</span>{plan.location && <span className="trip-print-location">{plan.location}</span>}</div>{plan.place && <p className="trip-print-facts">{[plan.place.rating === undefined ? null : `高德评分 ${plan.place.rating.toFixed(1)}`, plan.place.averageCost === undefined ? null : `人均 ¥${plan.place.averageCost}`, plan.place.openingHours ? `营业 ${plan.place.openingHours}` : null].filter(Boolean).join(" · ")}</p>}{plan.note && <p>{plan.note}</p>}</div></li>)}</ol> : <p className="trip-print-empty">暂无安排</p>}
        </article>;
      })}
    </section>
    <section className="trip-print-budget">
      <h2>预算</h2>
      <div className="trip-print-totals"><div><span>总预算</span><strong>{money(plannedTotal)}</strong></div><div><span>已支出</span><strong>{money(actualTotal)}</strong></div><div><span>{remaining >= 0 ? "剩余可用" : "超出预算"}</span><strong>{money(Math.abs(remaining))}</strong></div></div>
      <div className="trip-print-budget-lists"><div><h3>预计费用</h3>{budgetItems.length ? <ul>{budgetItems.map((item) => <li key={item.id}><span>{item.title} · {item.type}</span><strong>{money(item.amount)}</strong></li>)}</ul> : <p className="trip-print-empty">暂无预计费用</p>}</div><div><h3>实际消费</h3>{expenses.length ? <ul>{expenses.map((item) => <li key={item.id}><span>{item.item} · {item.type} · {item.by} 支付</span><strong>{money(item.amount)}</strong></li>)}</ul> : <p className="trip-print-empty">暂无实际消费</p>}</div></div>
    </section>
  </article>;
}