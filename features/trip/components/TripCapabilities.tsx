"use client";
import { createContext, useContext } from "react";
export type TripCapabilities = { canEditTrip: boolean; canManageMembers: boolean; canDeleteTrip: boolean; permissionStatus: "loading" | "ready" | "error" };
const defaults: TripCapabilities = { canEditTrip: true, canManageMembers: true, canDeleteTrip: true, permissionStatus: "ready" };
export const TripCapabilitiesContext = createContext<TripCapabilities>(defaults);
export const useTripCapabilities = () => useContext(TripCapabilitiesContext);
