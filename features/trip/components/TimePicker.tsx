import { CustomSelect } from "../../shared/components/CustomSelect";

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
      <CustomSelect ariaLabel="小时" className="time-select" options={[{ value: "", label: "时" }, ...hours.map((value) => ({ value, label: `${value} 时` }))]} value={hour} onChange={(value) => onChange(`${value}:${minute || "00"}`)} />
      <span>:</span>
      <CustomSelect ariaLabel="分钟" className="time-select" options={[{ value: "", label: "分" }, ...minutes.map((value) => ({ value, label: `${value} 分` }))]} value={minute} onChange={(value) => onChange(`${hour || "00"}:${value}`)} />
      {value && <button aria-label="清除时间" onClick={() => onChange("")} type="button">×</button>}
    </div>
  );
}
