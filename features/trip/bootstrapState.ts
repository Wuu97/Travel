import { defaultTripDetails, getDefaultStoredTrip } from "./data";
import type { StoredTrip, TripDetails } from "./model";
import { DEFAULT_TRIP_ID } from "./tripId";

export type NeutralTripBootstrap = { initialTrip: StoredTrip; initialDetails: TripDetails; tripId: string };

/** The deterministic state shared by SSR and the first client render. */
export function createNeutralTripBootstrap(): NeutralTripBootstrap {
  return { initialDetails: defaultTripDetails, initialTrip: getDefaultStoredTrip(), tripId: DEFAULT_TRIP_ID };
}
