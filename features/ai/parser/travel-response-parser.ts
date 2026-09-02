import type { RichContent } from "../../chat/model";
import { normalizeTripCategory, type ItineraryItem } from "../../trip/model";
import type { ItineraryAction, StructuredTravelResponse, TravelCoordinates, TravelExpenseSuggestion, TravelPlaceCard, TravelRestaurantCard, TravelRouteCard } from "../schemas/travel-response";
import { stableExpenseSuggestionId } from "./expense-id";

type ParsedStructuredTravelResponse = { response: StructuredTravelResponse; isStructured: boolean };
type RecordValue = Record<string, unknown>;

const text = (value: unknown, max = 300) => typeof value === "string" && value.trim() && value.trim().length <= max ? value.trim() : undefined;
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : undefined;
const list = (value: unknown) => Array.isArray(value) ? value : [];
const record = (value: unknown): RecordValue | undefined => value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : undefined;
const compact = <T>(items: T[], key: (item: T) => string, max: number) => items.filter((item, index, all) => all.findIndex((candidate) => key(candidate) === key(item)) === index).slice(0, max);

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const normalized = value.trim().replace(/^```(?:json)?\s*|\s*```$/gi, "");
  try { return JSON.parse(normalized); }
  catch { return undefined; }
}

function coordinates(value: unknown): TravelCoordinates | undefined {
  const raw = record(value);
  const latitude = number(raw?.latitude), longitude = number(raw?.longitude);
  return latitude !== undefined && longitude !== undefined ? { latitude, longitude } : undefined;
}

function images(value: unknown): string[] | undefined {
  const urls = compact(list(value).flatMap((item) => {
    const url = text(item, 1_500);
    return url && /^https?:\/\//i.test(url) ? [url] : [];
  }), (url) => url, 5);
  return urls.length ? urls : undefined;
}

function places(value: unknown): TravelPlaceCard[] {
  return compact(list(value).flatMap((item): TravelPlaceCard[] => {
    const raw = record(item); const name = text(raw?.name);
    return name ? [{ id: text(raw?.id, 120), name, description: text(raw?.description, 1_000), address: text(raw?.address, 500), category: text(raw?.category), rating: number(raw?.rating), openingHours: text(raw?.openingHours, 500), cost: text(raw?.cost, 300), images: images(raw?.images), coordinates: coordinates(raw?.coordinates) }] : [];
  }), (item) => (item.id || item.name).toLowerCase(), 8);
}

function restaurants(value: unknown): TravelRestaurantCard[] {
  return compact(list(value).flatMap((item): TravelRestaurantCard[] => {
    const raw = record(item); const name = text(raw?.name);
    return name ? [{ id: text(raw?.id, 120), name, cuisine: text(raw?.cuisine), rating: number(raw?.rating), priceRange: text(raw?.priceRange, 300), averageCost: number(raw?.averageCost), openingHours: text(raw?.openingHours, 500), address: text(raw?.address, 500), images: images(raw?.images), coordinates: coordinates(raw?.coordinates) }] : [];
  }), (item) => (item.id || item.name).toLowerCase(), 8);
}

function routes(value: unknown): TravelRouteCard[] {
  return compact(list(value).flatMap((item): TravelRouteCard[] => {
    const raw = record(item); const from = text(raw?.from); const to = text(raw?.to); const mode = text(raw?.mode);
    return from && to && mode ? [{ from, to, mode, duration: text(raw?.duration), distance: text(raw?.distance), description: text(raw?.description, 1_000) }] : [];
  }), (item) => `${item.from}|${item.to}|${item.mode}`.toLowerCase(), 6);
}

function actions(value: unknown): ItineraryAction[] {
  const actionTypes = ["add_place", "add_restaurant", "add_route"] as const;
  return compact(list(value).flatMap((item): ItineraryAction[] => {
    const raw = record(item); const type = raw?.type; const title = text(raw?.title);
    return typeof type === "string" && actionTypes.includes(type as ItineraryAction["type"]) && title ? [{ type: type as ItineraryAction["type"], targetId: text(raw?.targetId, 120), title }] : [];
  }), (item) => `${item.type}|${item.targetId || item.title}`, 12);
}

function expenses(value: unknown): TravelExpenseSuggestion[] {
  return compact(list(value).flatMap((item, index): TravelExpenseSuggestion[] => {
    const raw = record(item); const title = text(raw?.title); const amount = number(raw?.amount);
    const category = raw?.category ?? raw?.type;
    const normalizedCategory = normalizeTripCategory(category);
    if (!title || amount === undefined || amount <= 0 || !normalizedCategory) return [];
    const relatedItineraryItemId = text(raw?.relatedItineraryItemId, 120);
    const relatedItineraryTitle = text(raw?.relatedItineraryTitle, 300);
    return [{ id: stableExpenseSuggestionId({ id: text(raw?.id, 120), title, category: normalizedCategory, amount, relatedItineraryItemId, relatedItineraryTitle, index }), title, amount: Math.round(amount * 100) / 100, category: normalizedCategory, occurrence: "estimated", relatedItineraryItemId, relatedItineraryTitle }];
  }), (item) => item.id, 12);
}

/** Parses raw or fenced JSON and falls back to a plain Markdown-compatible answer. */
export function parseStructuredTravelResponse(value: unknown): ParsedStructuredTravelResponse {
  const parsed = record(parseJson(value));
  const answer = text(parsed?.answer, 20_000) ?? text(parsed?.content, 20_000);
  if (!parsed || !answer) return { response: { answer: typeof value === "string" ? value.trim() : "" }, isStructured: false };
  const parsedRestaurants = restaurants(parsed.restaurants);
  const parsedExpenses = expenses(parsed.expenses);
  // Restaurant facts may only be surfaced after the verified Amap merge. The first
  // model pass has no such provider result yet, so its standalone restaurant cards are dropped.
  const response: StructuredTravelResponse = {
    answer,
    ...(places(parsed.places).length ? { places: places(parsed.places) } : {}),
    ...(parsedRestaurants.length ? { restaurants: [] } : {}),
    ...(routes(parsed.routes).length ? { routes: routes(parsed.routes) } : {}),
    ...(parsedExpenses.length ? { expenses: parsedExpenses } : {}),
    ...(actions(parsed.itineraryActions).length ? { itineraryActions: actions(parsed.itineraryActions) } : {}),
  };
  return { response, isStructured: true };
}

function actionItem(action: ItineraryAction, index: number, names: Map<string, string>): ItineraryItem {
  const type = action.type === "add_place" ? "景点" : action.type === "add_restaurant" ? "餐饮" : "交通";
  return { id: action.targetId || `structured-action-${index}`, title: action.targetId ? names.get(action.targetId) || action.title : action.title, type, note: action.title };
}

/** Adapts the new response contract to the existing rich-card and import renderer. */
export function structuredTravelResponseToRichContent(response: StructuredTravelResponse): RichContent | undefined {
  const names = new Map<string, string>();
  response.places?.forEach((item) => { if (item.id) names.set(item.id, item.name); });
  response.restaurants?.forEach((item) => { if (item.id) names.set(item.id, item.name); });
  const actionByTarget = new Map<string, ItineraryItem>();
  response.itineraryActions?.forEach((action, index) => { if (action.targetId) actionByTarget.set(action.targetId, actionItem(action, index, names)); });
  const placesContent = response.places?.map((item) => ({ name: item.name, category: item.category, area: item.address, description: item.description, rating: item.rating, price: item.cost, openingHours: item.openingHours, itineraryItem: item.id ? actionByTarget.get(item.id) : undefined }));
  const restaurantsContent = response.restaurants?.map((item) => ({ name: item.name, cuisine: item.cuisine, area: item.address, rating: item.rating, averagePrice: item.averageCost !== undefined ? `¥${item.averageCost}/人` : item.priceRange, openingHours: item.openingHours, itineraryItem: item.id ? actionByTarget.get(item.id) : undefined }));
  const routesContent = response.routes?.map((item) => ({ ...item, itineraryItem: response.itineraryActions?.find((action) => action.type === "add_route" && action.targetId === `${item.from}|${item.to}`) ? actionItem(response.itineraryActions!.find((action) => action.type === "add_route" && action.targetId === `${item.from}|${item.to}`)!, 0, names) : undefined }));
  return placesContent?.length || restaurantsContent?.length || routesContent?.length ? { ...(placesContent?.length ? { places: placesContent } : {}), ...(restaurantsContent?.length ? { restaurants: restaurantsContent } : {}), ...(routesContent?.length ? { routes: routesContent } : {}) } : undefined;
}
