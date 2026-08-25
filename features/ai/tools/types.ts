export type TravelImage = {
  url: string;
  alt?: string;
  source?: string;
};

export type TravelDataSource = {
  provider: string;
  externalId?: string;
  url?: string;
};

export type TravelPlace = {
  id: string;
  name: string;
  category?: string;
  address?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  priceText?: string;
  openingHours?: string[];
  phone?: string;
  images?: TravelImage[];
  source?: TravelDataSource;
};

export type TravelRestaurant = {
  id: string;
  name: string;
  cuisine?: string[];
  category?: string;
  address?: string;
  area?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  averagePrice?: number;
  priceText?: string;
  openingHours?: string[];
  recommendedDishes?: string[];
  phone?: string;
  images?: TravelImage[];
  source?: TravelDataSource;
};

export type TravelLocationRef = {
  name: string;
  latitude?: number;
  longitude?: number;
  address?: string;
};

export type TravelRouteMode = "driving" | "walking" | "transit" | "cycling";

export type TravelRoute = {
  from: TravelLocationRef;
  to: TravelLocationRef;
  mode?: TravelRouteMode;
  durationMinutes?: number;
  distanceMeters?: number;
  costText?: string;
  description?: string;
  source?: TravelDataSource;
};

export type PlaceSearchInput = {
  query: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  limit?: number;
};

export type RestaurantSearchInput = {
  query?: string;
  city?: string;
  area?: string;
  cuisine?: string;
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  limit?: number;
};

export type RouteInput = {
  from: TravelLocationRef;
  to: TravelLocationRef;
  mode?: TravelRouteMode;
};
