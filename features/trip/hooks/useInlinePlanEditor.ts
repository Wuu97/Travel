import type { Dispatch, SetStateAction } from "react";
import type { ItineraryItem } from "../model";
import { sortItineraryItems } from "../utils";

type InlineEdit = { id: string; field: "title" | "note" | "time" | "type"; value: string };
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
      const next = current.map((plan) => plan.id === edit.id ? { ...plan, [edit.field]: value || undefined } : plan);
      return edit.field === "time" ? sortItineraryItems(next) : next;
    });
    setEdit(null);
    announceSave();
  };
  return { saveInlinePlan };
}
