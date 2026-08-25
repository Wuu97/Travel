/* eslint-disable @next/next/no-img-element -- Rich content accepts optional remote URLs and degrades to text-only on image errors. */
import type { ItineraryItem } from "../../trip/model";
import type { RichContent, RichPlace, RichRestaurant, RichRoute, RichCost } from "../model";

type Props = { content?: RichContent; isPlanAdded: (item: ItineraryItem) => boolean; onAddItineraries: (items: ItineraryItem[]) => void };

function ImportAction({ item, isPlanAdded, onAddItineraries }: Pick<Props, "isPlanAdded" | "onAddItineraries"> & { item?: ItineraryItem }) {
  if (!item) return null;
  const added = isPlanAdded(item);
  return <button className="rich-card-action" type="button" disabled={added} onClick={() => onAddItineraries([item])}>{added ? "✓ 已加入" : "加入行程"}</button>;
}

function Card({ item, kind, isPlanAdded, onAddItineraries }: { item: RichPlace | RichRestaurant; kind: "place" | "restaurant" } & Pick<Props, "isPlanAdded" | "onAddItineraries">) {
  const place = item as RichPlace;
  const restaurant = item as RichRestaurant;
  const meta = kind === "place" ? [place.category, place.area].filter(Boolean).join(" · ") : [restaurant.cuisine, restaurant.area].filter(Boolean).join(" · ");
  const price = kind === "place" ? place.price : restaurant.averagePrice;
  const dishes = kind === "restaurant" ? (item as RichRestaurant).recommendedDishes?.slice(0, 4) : undefined;
  return <article className="rich-card">
    {item.imageUrl && <img src={item.imageUrl} alt={item.name} onError={(event) => { event.currentTarget.hidden = true; }} />}
    <div className="rich-card-body"><div className="rich-card-title"><b>{item.name}</b>{item.rating !== undefined && <span>★ {item.rating}{item.reviewCount ? ` · ${item.reviewCount}` : ""}</span>}</div>{meta && <small>{meta}</small>}{item.description && <p>{item.description}</p>}{dishes?.length && <div className="rich-card-tags">{dishes.map((dish) => <em key={dish}>{dish}</em>)}</div>}<div className="rich-card-facts">{price && <span>{price}</span>}{item.openingHours && <span>{item.openingHours}</span>}{kind === "place" && place.recommendedDuration && <span>{place.recommendedDuration}</span>}</div><ImportAction item={item.itineraryItem} isPlanAdded={isPlanAdded} onAddItineraries={onAddItineraries} /></div>
  </article>;
}

function Route({ item, isPlanAdded, onAddItineraries }: { item: RichRoute } & Pick<Props, "isPlanAdded" | "onAddItineraries">) { return <article className="rich-route"><b>{item.from || "出发地"}</b><div><span>{item.mode || "路线"}</span>{item.duration && <span>{item.duration}</span>}{item.distance && <span>{item.distance}</span>}{item.cost && <span>{item.cost}</span>}{item.description && <small>{item.description}</small>}</div><b>{item.to || "目的地"}</b><ImportAction item={item.itineraryItem} isPlanAdded={isPlanAdded} onAddItineraries={onAddItineraries} /></article>; }
function Cost({ items }: { items: RichCost[] }) { return <section className="rich-cost"><b>预计费用</b>{items.map((item) => <div key={`${item.label}-${item.amount}`}><span>{item.label}{item.note ? ` · ${item.note}` : ""}</span><strong>{item.amount}</strong></div>)}{items.find((item) => item.total)?.total && <footer>合计 <strong>{items.find((item) => item.total)?.total}</strong></footer>}</section>; }

export function AiRichContent({ content, isPlanAdded, onAddItineraries }: Props) {
  if (!content) return null;
  const images = content.images?.slice(0, 4) || [];
  return <div className="ai-rich-content">{content.places?.length ? <section><h4>推荐景点</h4><div className="rich-card-grid">{content.places.map((item, index) => <Card item={item} key={`${item.name}-${index}`} kind="place" isPlanAdded={isPlanAdded} onAddItineraries={onAddItineraries} />)}</div></section> : null}{content.restaurants?.length ? <section><h4>推荐餐厅</h4><div className="rich-card-grid">{content.restaurants.map((item, index) => <Card item={item} key={`${item.name}-${index}`} kind="restaurant" isPlanAdded={isPlanAdded} onAddItineraries={onAddItineraries} />)}</div></section> : null}{content.routes?.map((item, index) => <Route item={item} key={`${item.from}-${item.to}-${index}`} isPlanAdded={isPlanAdded} onAddItineraries={onAddItineraries} />)}{content.costs?.length ? <Cost items={content.costs} /> : null}{images.length ? <div className="rich-image-gallery">{images.map((image, index) => <img key={`${image.url}-${index}`} src={image.url} alt={image.alt || "旅行图片"} onError={(event) => { event.currentTarget.hidden = true; }} />)}</div> : null}</div>;
}
