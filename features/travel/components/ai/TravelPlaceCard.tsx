import type { TravelPlaceCard as PlaceCard } from "../../../ai/schemas/travel-response";
import type { GalleryImage } from "../../../chat/components/TravelImageGallery";
import { TravelImageGallery } from "../../../chat/components/TravelImageGallery";
import type { ItineraryAction } from "../../../ai/schemas/travel-response";
import type { ItineraryItem } from "../../../trip/model";
import { ItineraryActionButton } from "./ItineraryActionButton";

type Props = { card: PlaceCard; images: GalleryImage[]; action?: ItineraryAction; actionIndex: number; isPlanAdded: (item: ItineraryItem) => boolean; onAddItineraries: (items: ItineraryItem[]) => void };

export function TravelPlaceCard({ card, images, action, actionIndex, isPlanAdded, onAddItineraries }: Props) {
  return <article className="rich-card structured-travel-card">
    <TravelImageGallery images={images} name={card.name} />
    <div className="rich-card-body">
      <div className="rich-card-title"><b>{card.name}</b>{card.rating !== undefined ? <span>★ {card.rating}</span> : null}</div>
      {card.category ? <small>{card.category}</small> : null}
      {card.description ? <p>{card.description}</p> : null}
      <div className="rich-card-facts">
        {card.address ? <span>{card.address}</span> : null}
        {card.openingHours ? <span>{card.openingHours}</span> : null}
        {card.cost ? <span>{card.cost}</span> : null}
      </div>
      {action ? <ItineraryActionButton action={action} index={actionIndex} targetName={card.name} isPlanAdded={isPlanAdded} onAddItineraries={onAddItineraries} /> : null}
    </div>
  </article>;
}
