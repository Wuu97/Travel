import type { RefObject } from "react";
import type { TripDetails } from "../model";
import { CustomDateRangePicker } from "./CustomDateRangePicker";

type Props = { details: TripDetails; isOpen: boolean; onChange: (details: Partial<TripDetails>) => void; onToggle: () => void; panelRef: RefObject<HTMLDivElement | null> };

export function TripDateEditor({ details, isOpen, onChange, onToggle, panelRef }: Props) {
  return <div className="trip-date-row" ref={isOpen ? panelRef : null}>
    <button type="button" className="inline-readable date-trigger" aria-expanded={isOpen} onClick={onToggle}>{details.startDate.replaceAll("-", ".")} - {details.endDate.replaceAll("-", ".")}<span aria-hidden="true">✎</span></button>
    <span>· {details.companions.length} 位同行人</span>
    {isOpen && <div className="trip-popover date-popover custom-date-popover"><CustomDateRangePicker endDate={details.endDate} onChange={onChange} startDate={details.startDate} /></div>}
  </div>;
}
