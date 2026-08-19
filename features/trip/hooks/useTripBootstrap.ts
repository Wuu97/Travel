import { useState } from "react";
import { defaultTripDetails, getDefaultStoredTrip } from "../data";
import type { StoredTrip, TripDetails } from "../model";
import { loadStoredTrip, loadTripDetails } from "../storage";

const DEFAULT_TRIP_ID = "hangzhou-summer-trip";

/** Resolves the active trip and hydrates its local snapshot exactly once. */
export function useTripBootstrap(enabled: boolean): { initialTrip: StoredTrip; initialDetails: TripDetails; tripId: string } {
  const [tripId] = useState(() => enabled ? new URLSearchParams(window.location.search).get("trip") || DEFAULT_TRIP_ID : DEFAULT_TRIP_ID);
  const [initialTrip] = useState(() => enabled ? loadStoredTrip(getDefaultStoredTrip()) : getDefaultStoredTrip());
  const [initialDetails] = useState(() => enabled ? loadTripDetails(defaultTripDetails) : defaultTripDetails);
  return { initialDetails, initialTrip, tripId };
}
