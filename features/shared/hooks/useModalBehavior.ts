"use client";

import { useEffect } from "react";

let lockCount = 0;
let previousBodyOverflow = "";
let previousHtmlOverflow = "";

/** Adds the standard escape-to-close and background-scroll lock for modal dialogs. */
export function useModalBehavior(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Esc" || event.code === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    const onWheel = (event: WheelEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const scrollContainer = target?.closest<HTMLElement>("[data-modal-scroll-lock]");
      if (!scrollContainer) {
        event.preventDefault();
        return;
      }
      const atTop = scrollContainer.scrollTop <= 0;
      const atBottom = scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 1;
      if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) event.preventDefault();
    };
    const body = document.body;
    const html = document.documentElement;
    if (lockCount === 0) {
      previousBodyOverflow = body.style.overflow;
      previousHtmlOverflow = html.style.overflow;
      body.style.overflow = "hidden";
      html.style.overflow = "hidden";
    }
    lockCount += 1;
    // Capture before focused controls or scroll containers can stop bubbling.
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("wheel", onWheel, { capture: true, passive: false });

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("wheel", onWheel, true);
      lockCount -= 1;
      if (lockCount === 0) {
        body.style.overflow = previousBodyOverflow;
        html.style.overflow = previousHtmlOverflow;
      }
    };
  }, [onClose, open]);
}
