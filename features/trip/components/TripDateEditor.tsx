import type { RefObject } from "react";
import type { TripDetails } from "../model";
import { CustomDateRangePicker } from "./CustomDateRangePicker";
import { useTripCapabilities } from "./TripCapabilities";

type Props = { details: TripDetails; isOpen: boolean; onChange: (details: Partial<TripDetails>) => void; onToggle: () => void; panelRef: RefObject<HTMLDivElement | null> };

export function TripDateEditor({ details, isOpen, onChange, onToggle, panelRef }: Props) {
  const { canEditTrip, permissionStatus } = useTripCapabilities();
  const permissionsPending = permissionStatus === "loading";
  const keepEditableStructure = canEditTrip || permissionsPending;
  return <div className="trip-date-row" ref={isOpen ? panelRef : null}>
    {keepEditableStructure ? <button type="button" className="inline-readable date-trigger" aria-disabled={permissionsPending} aria-expanded={isOpen} onClick={() => { if (!permissionsPending) onToggle(); }}>{details.startDate.replaceAll("-", ".")} - {details.endDate.replaceAll("-", ".")}<span aria-hidden="true">✎</span></button> : <span className="date-trigger">{details.startDate.replaceAll("-", ".")} - {details.endDate.replaceAll("-", ".")}</span>}
    <span>· {details.companions.length} 位同行人</span>
    {canEditTrip && isOpen && <div className="trip-popover date-popover custom-date-popover"><CustomDateRangePicker endDate={details.endDate} onChange={onChange} startDate={details.startDate} /></div>}
  </div>;
}
