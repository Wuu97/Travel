import type { MouseEvent } from "react";

/** Provides consistent in-page navigation without changing the current URL query. */
export function useAnchorNavigation() {
  return (event: MouseEvent<HTMLAnchorElement>, target: string) => {
    event.preventDefault();
    document.querySelector(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
}
