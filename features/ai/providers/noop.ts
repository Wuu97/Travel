import type { PlaceProvider, RestaurantProvider, RouteProvider } from "./types";

export const noopPlaceProvider: PlaceProvider = {
  async searchPlaces() { return []; },
  async getPlaceDetails() { return null; },
};

export const noopRestaurantProvider: RestaurantProvider = {
  async searchRestaurants() { return []; },
  async getRestaurantDetails() { return null; },
};

export const noopRouteProvider: RouteProvider = {
  async getRoute() { return null; },
};
