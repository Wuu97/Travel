import type { TripDetails } from "../model";
import { statusTagColors } from "../data";
import { useTripCapabilities } from "./TripCapabilities";

type Props = { isOpen: boolean; onSelect: (status: TripDetails["status"]) => void; onToggle: () => void; status: TripDetails["status"]; };
export function TripStatusSelector({ isOpen, onSelect, onToggle, status }: Props) {
  const { canEditTrip } = useTripCapabilities();
  if (!canEditTrip) return <span className="status-trigger" style={statusTagColors[status]}>{status}</span>;
  return <><button type="button" className="status-trigger inline-readable" aria-label="修改行程状态" aria-expanded={isOpen} onClick={onToggle} style={statusTagColors[status]}>{status}<span aria-hidden="true">✎</span></button>{isOpen && <div className="trip-popover status-popover">{(["筹备中", "进行中", "已结束"] as const).map((item) => <button key={item} type="button" onClick={() => onSelect(item)}><i style={statusTagColors[item]} />{item}</button>)}</div>}</>;
}
