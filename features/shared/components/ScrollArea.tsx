"use client";

import type { ReactNode, WheelEvent } from "react";

type Props = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
};

/** A scroll container that prevents wheel scrolling from leaking into the page. */
export function ScrollArea({ ariaLabel, children, className = "" }: Props) {
  const containWheel = (event: WheelEvent<HTMLDivElement>) => {
    const area = event.currentTarget;
    const atTop = area.scrollTop <= 0;
    const atBottom = area.scrollTop + area.clientHeight >= area.scrollHeight - 1;
    if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) event.preventDefault();
    event.stopPropagation();
  };

  return <div aria-label={ariaLabel} className={`scroll-area ${className}`.trim()} onWheel={containWheel}>{children}</div>;
}
