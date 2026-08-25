import type { RichContent } from "../../../chat/model";
import type { ItineraryItem } from "../../../trip/model";
import type { StructuredTravelResponse as StructuredResponse, TravelPlaceCard as PlaceCard, TravelRestaurantCard as RestaurantCard, TravelRouteCard as RouteCard } from "../../../ai/schemas/travel-response";
import { AiRichContent } from "../../../chat/components/AiRichContent";
import type { GalleryImage } from "../../../chat/components/TravelImageGallery";
import { ItineraryActionButton } from "./ItineraryActionButton";
import { TravelPlaceCard } from "./TravelPlaceCard";
import { TravelRestaurantCard } from "./TravelRestaurantCard";
import { TravelRouteCard } from "./TravelRouteCard";

type Props = { response?: StructuredResponse; content?: RichContent; isPlanAdded: (item: ItineraryItem) => boolean; onAddItineraries: (items: ItineraryItem[]) => void };

const key = (id: string | undefined, name: string) => (id || name).trim().toLowerCase();
const providerImages = (images?: Array<{ url: string; alt?: string; sourceUrl?: string }>): GalleryImage[] => images?.map(({ url, alt, sourceUrl }) => ({ url, alt, sourceUrl })) ?? [];
const findAction = (response: StructuredResponse, type: StructuredResponse["itineraryActions"] extends Array<infer Item> | undefined ? Item extends { type: infer ActionType } ? ActionType : never : never, targetId?: string) => response.itineraryActions?.find((action) => action.type === type && (!targetId || action.targetId === targetId));

function placeCards(response: StructuredResponse, content?: RichContent): Array<{ card: PlaceCard; images: GalleryImage[] }> {
  const provider = content?.places ?? [];
  const structured = response.places ?? [];
  const cards = structured.map((card) => {
    const source = provider.find((item) => item.name.toLowerCase() === card.name.toLowerCase());
    return { card: { ...card, category: source?.category ?? card.category, address: source?.area ?? card.address, rating: source?.rating === undefined ? card.rating : Number(source.rating), openingHours: source?.openingHours ?? card.openingHours, cost: source?.price ?? card.cost }, images: providerImages(source?.images) };
  });
  for (const source of provider) if (!cards.some(({ card }) => card.name.toLowerCase() === source.name.toLowerCase())) cards.push({ card: { name: source.name, category: source.category, address: source.area, rating: source.rating === undefined ? undefined : Number(source.rating), openingHours: source.openingHours, cost: source.price, description: source.description }, images: providerImages(source.images) });
  return cards;
}

function restaurantCards(response: StructuredResponse, content?: RichContent): Array<{ card: RestaurantCard; images: GalleryImage[] }> {
  const provider = content?.restaurants ?? [];
  const structured = response.restaurants ?? [];
  const cards = structured.map((card) => {
    const source = provider.find((item) => item.name.toLowerCase() === card.name.toLowerCase());
    return { card: { ...card, cuisine: source?.cuisine ?? card.cuisine, address: source?.area ?? card.address, rating: source?.rating === undefined ? card.rating : Number(source.rating), averageCost: source?.averagePrice ? Number(String(source.averagePrice).replace(/\D/g, "")) : card.averageCost, openingHours: source?.openingHours ?? card.openingHours }, images: providerImages(source?.images) };
  });
  for (const source of provider) if (!cards.some(({ card }) => card.name.toLowerCase() === source.name.toLowerCase())) cards.push({ card: { name: source.name, cuisine: source.cuisine, address: source.area, rating: source.rating === undefined ? undefined : Number(source.rating), priceRange: source.averagePrice, averageCost: undefined, openingHours: source.openingHours }, images: providerImages(source.images) });
  return cards;
}

function routeCards(response: StructuredResponse, content?: RichContent): RouteCard[] {
  const structured = response.routes ?? [];
  const provider = content?.routes ?? [];
  return [...structured, ...provider.filter((source) => !structured.some((route) => route.from === source.from && route.to === source.to)).flatMap((source) => source.from && source.to && source.mode ? [{ from: source.from, to: source.to, mode: source.mode, duration: source.duration, distance: source.distance, description: source.description }] : [])];
}

/** Presentation boundary for the structured AI response; it reuses the established card and import UX. */
export function StructuredTravelResponse({ response, content, isPlanAdded, onAddItineraries }: Props) {
  if (!response) return <AiRichContent content={content} isPlanAdded={isPlanAdded} onAddItineraries={onAddItineraries} />;
  const places = placeCards(response, content); const restaurants = restaurantCards(response, content); const routes = routeCards(response, content);
  const renderedActionIds = new Set<string>();
  return <div className="ai-rich-content structured-travel-response">
    {places.length ? <section><h4>推荐景点</h4><div className="rich-card-grid">{places.map(({ card, images }, index) => { const action = findAction(response, "add_place", card.id); if (action) renderedActionIds.add(`${action.type}|${action.targetId || action.title}`); return <TravelPlaceCard key={key(card.id, card.name)} card={card} images={images} action={action} actionIndex={index} isPlanAdded={isPlanAdded} onAddItineraries={onAddItineraries} />; })}</div></section> : null}
    {restaurants.length ? <section><h4>推荐餐厅</h4><div className="rich-card-grid">{restaurants.map(({ card, images }, index) => { const action = findAction(response, "add_restaurant", card.id); if (action) renderedActionIds.add(`${action.type}|${action.targetId || action.title}`); return <TravelRestaurantCard key={key(card.id, card.name)} card={card} images={images} action={action} actionIndex={index} isPlanAdded={isPlanAdded} onAddItineraries={onAddItineraries} />; })}</div></section> : null}
    {routes.map((card, index) => { const action = findAction(response, "add_route", `${card.from}|${card.to}`); if (action) renderedActionIds.add(`${action.type}|${action.targetId || action.title}`); return <TravelRouteCard key={`${card.from}|${card.to}|${index}`} card={card} action={action} actionIndex={index} isPlanAdded={isPlanAdded} onAddItineraries={onAddItineraries} />; })}
    {response.itineraryActions?.filter((action) => !renderedActionIds.has(`${action.type}|${action.targetId || action.title}`)).map((action, index) => <ItineraryActionButton key={`${action.type}-${action.targetId || action.title}`} action={action} index={index} isPlanAdded={isPlanAdded} onAddItineraries={onAddItineraries} />)}
  </div>;
}
