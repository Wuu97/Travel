import type { ItineraryAction, TravelRouteCard as RouteCard } from "../../../ai/schemas/travel-response";
import type { ItineraryItem } from "../../../trip/model";
import { ItineraryActionButton } from "./ItineraryActionButton";

type Props = { card: RouteCard; action?: ItineraryAction; actionIndex: number; isPlanAdded: (item: ItineraryItem) => boolean; onAddItineraries: (items: ItineraryItem[]) => void };

export function TravelRouteCard({ card, action, actionIndex, isPlanAdded, onAddItineraries }: Props) {
  return <article className="rich-route structured-route-card">
    <b>{card.from}</b><div><span>{card.mode}</span>{card.duration ? <span>{card.duration}</span> : null}{card.distance ? <span>{card.distance}</span> : null}{card.description ? <small>{card.description}</small> : null}</div><b>{card.to}</b>
    {action ? <ItineraryActionButton action={action} index={actionIndex} targetName={`${card.from} → ${card.to}`} isPlanAdded={isPlanAdded} onAddItineraries={onAddItineraries} /> : null}
  </article>;
}
