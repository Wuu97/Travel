"use client";

import { ConfirmDialogProvider } from "../../shared/components/ConfirmDialog";
import { useSyncExternalStore } from "react";
import { TravelAppContent } from "./TravelAppContent";

const subscribeToHydration = () => () => {};
const getClientHydrationState = () => true;
const getServerHydrationState = () => false;
const subscribeToTripLocation = (onStoreChange: () => void) => {
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener("tuyu-tripchange", onStoreChange);
  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener("tuyu-tripchange", onStoreChange);
  };
};
const getTripLocation = () => window.location.search;
const getServerTripLocation = () => "";

export function TravelApp() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationState,
    getServerHydrationState,
  );
  const tripLocation = useSyncExternalStore(
    subscribeToTripLocation,
    getTripLocation,
    getServerTripLocation,
  );
  return (
    <ConfirmDialogProvider><TravelAppContent
      key={`${hydrated ? "hydrated" : "server"}:${tripLocation}`}
      loadPersistedState={hydrated}
    /></ConfirmDialogProvider>
  );
}
