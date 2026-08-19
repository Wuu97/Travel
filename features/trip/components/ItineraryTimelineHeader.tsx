export function ItineraryTimelineHeader({ day, onOptimize }: { day: number; onOptimize: () => void }) {
  return (
    <div className="timeline-head">
      <b>DAY {day}</b>
      <button style={{ fontSize: 12, padding: "6px 10px" }} onClick={onOptimize}>✦ 让 AI 优化路线</button>
    </div>
  );
}
