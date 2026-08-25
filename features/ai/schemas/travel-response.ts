export type TravelCoordinates = { latitude: number; longitude: number };

export type TravelPlaceCard = {
  id?: string;
  name: string;
  description?: string;
  address?: string;
  category?: string;
  rating?: number;
  openingHours?: string;
  cost?: string;
  images?: string[];
  coordinates?: TravelCoordinates;
};

export type TravelRestaurantCard = {
  id?: string;
  name: string;
  cuisine?: string;
  rating?: number;
  priceRange?: string;
  averageCost?: number;
  openingHours?: string;
  address?: string;
  images?: string[];
  coordinates?: TravelCoordinates;
};

export type TravelRouteCard = {
  from: string;
  to: string;
  mode: string;
  duration?: string;
  distance?: string;
  description?: string;
};

export type ItineraryAction = {
  type: "add_place" | "add_restaurant" | "add_route";
  targetId?: string;
  title: string;
};

/** Provider-neutral, presentation-ready response returned by the travel AI. */
export type StructuredTravelResponse = {
  answer: string;
  places?: TravelPlaceCard[];
  restaurants?: TravelRestaurantCard[];
  routes?: TravelRouteCard[];
  itineraryActions?: ItineraryAction[];
};
