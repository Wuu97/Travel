type TripDay = { day: number; date: string };

type Props = {
  activeDay: number;
  days: TripDay[];
  onMovePlan: (id: string, day: number) => void;
  onSelectDay: (day: number) => void;
};

export function TripDayNavigation({ activeDay, days, onMovePlan, onSelectDay }: Props) {
  return (
    <nav className="trip-day-tabs" aria-label="选择行程天数">
      {days.map((item) => (
        <button key={item.day} className={activeDay === item.day ? "active-day" : ""} onClick={() => onSelectDay(item.day)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData("application/x-tuyu-itinerary"); if (id) onMovePlan(id, item.day); }}>
          <b>DAY {item.day}</b><span>{item.date.replaceAll("-", ".")}</span>
        </button>
      ))}
    </nav>
  );
}
