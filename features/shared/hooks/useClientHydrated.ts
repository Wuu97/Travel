import { useSyncExternalStore } from "react";

let hydrated = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!hydrated) {
    hydrated = true;
    listeners.forEach((notify) => notify());
  }
  return () => listeners.delete(listener);
}

const getSnapshot = () => hydrated;
const getServerSnapshot = () => false;

/** Shares a deterministic server/first-client snapshot before browser state restores. */
export function useClientHydrated() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
