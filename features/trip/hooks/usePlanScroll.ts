import { useEffect } from "react";
import type { ItineraryItem } from "../model";

type Options = { activeDay: number; plans: ItineraryItem[]; pendingPlanId: string | null; setPendingPlanId: (id: string | null) => void; timelineRef: React.RefObject<HTMLDivElement | null> };

/** Scrolls a newly created or copied itinerary item into the timeline viewport. */
export function usePlanScroll({ activeDay, pendingPlanId, plans, setPendingPlanId, timelineRef }: Options) {
  useEffect(() => {
    if (!pendingPlanId) return;
    const frame = requestAnimationFrame(() => {
      const timeline = timelineRef.current;
      const plan = timeline?.querySelector<HTMLElement>(`[data-plan-id="${pendingPlanId}"]`);
      if (timeline && plan) {
        const timelineBounds = timeline.getBoundingClientRect();
        const planBounds = plan.getBoundingClientRect();
        timeline.scrollBy({ top: planBounds.top - timelineBounds.top - timeline.clientHeight / 2 + planBounds.height / 2, behavior: "smooth" });
      }
      setPendingPlanId(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [activeDay, pendingPlanId, plans, setPendingPlanId, timelineRef]);
}
