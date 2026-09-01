"use client";
import { createContext, useContext } from "react";
export type TripCapabilities = { canEditTrip: boolean; canManageMembers: boolean; canDeleteTrip: boolean; permissionStatus: "loading" | "ready" | "error" };
const defaults: TripCapabilities = { canEditTrip: true, canManageMembers: true, canDeleteTrip: true, permissionStatus: "ready" };
export const TripCapabilitiesContext = createContext<TripCapabilities>(defaults);
export const useTripCapabilities = () => useContext(TripCapabilitiesContext);

/** Loading preserves editable-compatible layout while keeping every action inert. */
export const useTripPresentation = () => {
  const capabilities = useTripCapabilities();
  return {
    ...capabilities,
    editableStructure: capabilities.canEditTrip || capabilities.permissionStatus === "loading",
    interactionEnabled: capabilities.canEditTrip,
  };
};
