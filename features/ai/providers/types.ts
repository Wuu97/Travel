import type { PlaceSearchInput, RestaurantSearchInput, RouteInput, TravelPlace, TravelRestaurant, TravelRoute } from "../tools/types";

export interface PlaceProvider {
  searchPlaces(input: PlaceSearchInput): Promise<TravelPlace[]>;
  getPlaceDetails(id: string): Promise<TravelPlace | null>;
}

export interface RestaurantProvider {
  searchRestaurants(input: RestaurantSearchInput): Promise<TravelRestaurant[]>;
  getRestaurantDetails(id: string): Promise<TravelRestaurant | null>;
}

export interface RouteProvider {
  getRoute(input: RouteInput): Promise<TravelRoute | null>;
}
