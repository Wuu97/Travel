type HistoryWriter = Pick<History, "pushState" | "replaceState">;
type LocationReader = Pick<Location, "hash" | "pathname" | "search">;

export type HistoryWriteMode = "push" | "replace";

export function toRelativeUrl(url: URL | LocationReader) {
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Writes browser history only when the complete visible URL actually changes. */
export function writeHistoryIfChanged(mode: HistoryWriteMode, nextUrl: URL, reason: string, location: LocationReader = window.location, history: HistoryWriter = window.history) {
  const next = toRelativeUrl(nextUrl);
  const current = toRelativeUrl(location);
  if (next === current) return false;
  if (process.env.NODE_ENV === "development") console.debug("[trip-history]", { reason, current, next, operation: mode, timestamp: Date.now() });
  if (mode === "push") history.pushState(null, "", next);
  else history.replaceState(null, "", next);
  return true;
}
