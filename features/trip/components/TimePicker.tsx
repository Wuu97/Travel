type Props = {
  onChange: (value: string) => void;
  value: string;
};

const hours = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, "0"));

export function TimePicker({ onChange, value }: Props) {
  const [hour = "", minute = ""] = value.split(":");
  return (
    <div className="time-picker">
      <select aria-label="小时" value={hour} onChange={(event) => onChange(`${event.target.value}:${minute || "00"}`)}>
        <option value="">时</option>
        {hours.map((item) => <option key={item} value={item}>{item} 时</option>)}
      </select>
      <span>:</span>
      <select aria-label="分钟" value={minute} onChange={(event) => onChange(`${hour || "00"}:${event.target.value}`)}>
        <option value="">分</option>
        {minutes.map((item) => <option key={item} value={item}>{item} 分</option>)}
      </select>
      {value && <button aria-label="清除时间" onClick={() => onChange("")} type="button">×</button>}
    </div>
  );
}