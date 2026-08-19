import type { RefObject } from "react";
import type { TripDetails } from "../model";

type Props = { details: TripDetails; isOpen: boolean; onChange: (details: Partial<TripDetails>) => void; onToggle: () => void; panelRef: RefObject<HTMLDivElement | null> };
export function TripDateEditor({ details, isOpen, onChange, onToggle, panelRef }: Props) {
  const updateStartDate = (startDate: string) => onChange({ startDate, endDate: startDate > details.endDate ? startDate : details.endDate });
  return <div className="trip-date-row" ref={isOpen ? panelRef : null}><button type="button" className="inline-readable date-trigger" aria-expanded={isOpen} onClick={onToggle}>{details.startDate.replaceAll("-", ".")} - {details.endDate.replaceAll("-", ".")}<span aria-hidden="true">✎</span></button><span>· {details.companions.length} 位同行人</span>{isOpen && <div className="trip-popover date-popover"><label>出发<input type="date" value={details.startDate} onChange={(event) => updateStartDate(event.target.value)} /></label><label>返程<input type="date" min={details.startDate} value={details.endDate} onChange={(event) => onChange({ endDate: event.target.value })} /></label></div>}</div>;
}
