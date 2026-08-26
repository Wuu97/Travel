import type { ExpenseItem, ItineraryItem } from "../../trip/model";
import type { ChatMessage } from "../model";

type Props = {
  message: ChatMessage;
  selected: Record<string, boolean>;
  isPlanAdded: (item: ItineraryItem) => boolean;
  isExpenseAdded: (item: ExpenseItem, destination: "budget" | "ledger") => boolean;
  onAddItineraries: (items: ItineraryItem[]) => void;
  onAddExpenses: (items: ExpenseItem[], destination: "budget" | "ledger") => void;
  onToggle: (id: string) => void;
  onToggleMany: (ids: string[]) => void;
};

/** Presentation for selectively importing structured AI suggestions into a trip. */
export function ChatImportPanel({
  isExpenseAdded,
  isPlanAdded,
  message,
  onAddExpenses,
  onAddItineraries,
  onToggle,
  onToggleMany,
  selected,
}: Props) {
  const itineraryItems = message.itineraryItems || [];
  const expenseItems = message.expenseItems || [];
  if (!itineraryItems.length && !expenseItems.length) return null;

  const selectedItineraries = itineraryItems.filter((item) => selected[`plan-${item.id}`]);
  const selectedBudget = expenseItems.filter((item) => selected[`budget-${item.id}`]);

  return (
    <div className="ai-imports">
      {itineraryItems.length > 0 && (
        <section>
          <header>
            <b>可导入行程</b>
            {selectedItineraries.length > 0 && <button onClick={() => onAddItineraries(selectedItineraries)}>添加已选 {selectedItineraries.length} 项</button>}
          </header>
          {itineraryItems.map((item) => {
            const added = isPlanAdded(item);
            return (
              <div className="import-row" key={item.id}>
                <input aria-label={`选择${item.title}`} type="checkbox" checked={Boolean(selected[`plan-${item.id}`])} onChange={() => onToggle(`plan-${item.id}`)} disabled={added} />
                <div><strong>{item.title}</strong><small>{item.type}{item.day ? ` · DAY ${item.day}` : ""}{item.date ? ` · ${item.date}` : ""}{item.time ? ` ${item.time}` : ""}</small></div>
                <button disabled={added} onClick={() => onAddItineraries([item])}>{added ? "已添加" : "添加到行程"}</button>
              </div>
            );
          })}
        </section>
      )}
      {expenseItems.length > 0 && (
        <section>
          <header>
            <b>预计费用</b>
            <button type="button" onClick={() => onToggleMany(expenseItems.map((item) => `budget-${item.id}`))}>{expenseItems.every((item) => selected[`budget-${item.id}`]) ? "取消全选" : "全选"}</button>
            {selectedBudget.length > 0 && <button onClick={() => onAddExpenses(selectedBudget, "budget")}>导入已选 {selectedBudget.length} 项</button>}
          </header>
          {expenseItems.map((item) => {
            const destination = "budget";
            const added = isExpenseAdded(item, destination);
            return (
              <div className="import-row" key={item.id}>
                <input aria-label={`选择${item.title}`} type="checkbox" checked={Boolean(selected[`${destination}-${item.id}`])} onChange={() => onToggle(`${destination}-${item.id}`)} disabled={added} />
                <div><strong>{item.title} · ¥ {item.amount}</strong><small>{item.type} · 预计费用{item.relatedItineraryTitle ? ` · 关联 ${item.relatedItineraryTitle}` : ""}</small></div>
                <button disabled={added} onClick={() => onAddExpenses([item], destination)}>{added ? "已导入" : "加入预算"}</button>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
