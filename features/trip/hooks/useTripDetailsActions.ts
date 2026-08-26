import type { Dispatch, SetStateAction } from "react";
import { readTripCover } from "../cover";
import type { ItineraryItem, TripDetails } from "../model";
import { getTripDays, movePlansOutsideTripToPending } from "../utils";

type Options = { activeDay: number; announceSave: () => void; inlineTitle: string | null; setActiveDay: (day: number) => void; setDetails: Dispatch<SetStateAction<TripDetails>>; setInlineTitle: (value: string | null) => void; setPlans: Dispatch<SetStateAction<ItineraryItem[]>> };

/** Coordinates editable trip metadata and keeps the selected day valid after date changes. */
export function useTripDetailsActions({ activeDay, announceSave, inlineTitle, setActiveDay, setDetails, setInlineTitle, setPlans }: Options) {
  const updateTripDetails = (patch: Partial<TripDetails>) => {
    setDetails((current) => {
      const next = { ...current, ...patch };
      const nextDays = getTripDays(next.startDate, next.endDate);
      if (!nextDays.some((item) => item.day === activeDay)) setActiveDay(1);
      if (patch.startDate !== undefined || patch.endDate !== undefined) {
        const lastDay = nextDays.at(-1)!.day;
        setPlans((plans) => movePlansOutsideTripToPending(plans, lastDay));
      }
      return next;
    });
    announceSave();
  };
  const saveInlineTitle = () => {
    if (inlineTitle?.trim()) updateTripDetails({ title: inlineTitle.trim() });
    setInlineTitle(null);
  };
  const chooseCoverImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const coverImage = await readTripCover(file);
    if (coverImage) setDetails((current) => ({ ...current, coverImage }));
  };
  return { chooseCoverImage, saveInlineTitle, updateTripDetails };
}
