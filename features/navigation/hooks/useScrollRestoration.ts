import { useLayoutEffect } from "react";

export function useScrollRestoration() {
  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history)
      window.history.scrollRestoration = "manual";
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );

    const savedPosition = sessionStorage.getItem("tuyu-scroll-position");
    if (savedPosition) window.scrollTo(0, Number(savedPosition));

    const savePosition = () =>
      sessionStorage.setItem("tuyu-scroll-position", String(window.scrollY));
    window.addEventListener("pagehide", savePosition);
    window.addEventListener("beforeunload", savePosition);
    return () => {
      window.removeEventListener("pagehide", savePosition);
      window.removeEventListener("beforeunload", savePosition);
    };
  }, []);
}
