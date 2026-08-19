type TripDay = { day: number; date: string };

type Props = {
  activeDay: number;
  days: TripDay[];
  onSelectDay: (day: number) => void;
};

export function TripDayNavigation({ activeDay, days, onSelectDay }: Props) {
  return (
    <aside>
      <b>行程安排</b>
      {days.map((item) => (
        <button key={item.day} className={activeDay === item.day ? "active-day" : ""} onClick={() => onSelectDay(item.day)} style={{ fontSize: 11 }}>
          DAY {item.day} <span style={{ color: "#597568", fontSize: 12 }}>{item.date}</span>
        </button>
      ))}
    </aside>
  );
}
