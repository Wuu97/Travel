import type { TravelRestaurantCard as RestaurantCard, ItineraryAction } from "../../../ai/schemas/travel-response";
import type { GalleryImage } from "../../../chat/components/TravelImageGallery";
import { TravelImageGallery } from "../../../chat/components/TravelImageGallery";
import type { ItineraryItem } from "../../../trip/model";
import { ItineraryActionButton } from "./ItineraryActionButton";
import { FeedbackButton } from "./FeedbackButton";

type Props = { card: RestaurantCard; images: GalleryImage[]; action?: ItineraryAction; actionIndex: number; isPlanAdded: (item: ItineraryItem) => boolean; onAddItineraries: (items: ItineraryItem[]) => void };

export function TravelRestaurantCard({ card, images, action, actionIndex, isPlanAdded, onAddItineraries }: Props) {
  const cost = card.averageCost !== undefined ? `¥${card.averageCost}/人` : card.priceRange;
  return <article className="rich-card structured-travel-card">
    <TravelImageGallery images={images} name={card.name} />
    <div className="rich-card-body">
      <div className="rich-card-title"><b>{card.name}</b>{card.rating !== undefined ? <span>★ {card.rating}</span> : null}</div>
      {card.cuisine ? <small>{card.cuisine}</small> : null}
      <div className="rich-card-facts">
        {cost ? <span>{cost}</span> : null}
        {card.openingHours ? <span>{card.openingHours}</span> : null}
        {card.address ? <span>{card.address}</span> : null}
      </div>
      {card.recommendationReasons?.length ? <div className="recommendation-reasons"><b>推荐理由</b>{card.recommendationReasons.map((reason) => <span key={reason}>• {reason}</span>)}</div> : null}
      <div className="structured-card-actions">{action ? <ItineraryActionButton action={action} index={actionIndex} targetName={card.name} category={card.cuisine} isPlanAdded={isPlanAdded} onAddItineraries={onAddItineraries} /> : null}<FeedbackButton event={{ type: "skip_recommendation", itemType: "restaurant", itemId: card.id, category: card.cuisine }} >不感兴趣</FeedbackButton></div>
    </div>
  </article>;
}
