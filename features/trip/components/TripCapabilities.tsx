"use client";
import { createContext, useContext } from "react";
export type TripCapabilities = { canEditTrip: boolean; canManageMembers: boolean; canDeleteTrip: boolean };
const defaults: TripCapabilities = { canEditTrip: true, canManageMembers: true, canDeleteTrip: true };
export const TripCapabilitiesContext = createContext<TripCapabilities>(defaults);
export const useTripCapabilities = () => useContext(TripCapabilitiesContext);
