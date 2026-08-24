import type { Dispatch, SetStateAction } from "react";
import { isItineraryType, type ItineraryItem } from "../model";
import { sortItineraryItems } from "../utils";

export type InlineEdit = { id: string; field: "title" | "note" | "time" | "type"; value: string };
type Options = { announceSave: () => void; edit: InlineEdit | null; setEdit: (edit: InlineEdit | null) => void; setPlans: Dispatch<SetStateAction<ItineraryItem[]>> };

/** Persists inline itinerary edits while preserving required-title validation. */
export function useInlinePlanEditor({ announceSave, edit, setEdit, setPlans }: Options) {
  const saveInlinePlan = () => {
    if (!edit) return;
    const value = edit.value.trim();
    if (edit.field === "title" && !value) {
      setEdit(null);
      return;
    }
    setPlans((current) => {
      const next = current.map((plan) => {
        if (plan.id !== edit.id) return plan;
        if (edit.field === "type") return isItineraryType(value) ? { ...plan, type: value } : plan;
        return { ...plan, [edit.field]: value || undefined };
      });
      return edit.field === "time" ? sortItineraryItems(next) : next;
    });
    setEdit(null);
    announceSave();
  };
  return { saveInlinePlan };
}
