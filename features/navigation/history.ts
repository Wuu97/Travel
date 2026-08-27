type HistoryWriter = Pick<History, "pushState" | "replaceState">;
type LocationReader = Pick<Location, "hash" | "pathname" | "search">;

export type HistoryWriteMode = "push" | "replace";

export function toRelativeUrl(url: URL | LocationReader) {
  return `${url.pathname}${url.search}${url.hash}`;
}

/** Writes browser history only when the complete visible URL actually changes. */
export function writeHistoryIfChanged(mode: HistoryWriteMode, nextUrl: URL, location: LocationReader = window.location, history: HistoryWriter = window.history) {
  const next = toRelativeUrl(nextUrl);
  if (next === toRelativeUrl(location)) return false;
  if (mode === "push") history.pushState(null, "", next);
  else history.replaceState(null, "", next);
  return true;
}
