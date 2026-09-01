import type { Dispatch, SetStateAction } from "react";
import { isItineraryType, type ItineraryItem } from "../model";
import { sortItineraryItems } from "../utils";

export type InlineEdit = { id: string; field: "title" | "note" | "time" | "type"; value: string };
type Options = { announceSave: () => void; edit: InlineEdit | null; onPlanRenamed: (plan: ItineraryItem) => void; setEdit: (edit: InlineEdit | null) => void; setPlans: Dispatch<SetStateAction<ItineraryItem[]>> };

export function getTimeValidationMessage(value: string) {
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(value.trim());
  if (!match) return "请填写小时和分钟";
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23) return "小时需为 0–23";
  if (minute > 59) return "分钟需为 0–59";
  return null;
}

export function normalizeTimeValue(value: string) {
  if (getTimeValidationMessage(value)) return null;
  const [hour, minute] = value.trim().split(":");
  return `${String(Number(hour)).padStart(2, "0")}:${String(Number(minute)).padStart(2, "0")}`;
}

/** Persists inline itinerary edits while preserving required-title validation. */
export function useInlinePlanEditor({ announceSave, edit, onPlanRenamed, setEdit, setPlans }: Options) {
  const saveInlinePlan = () => {
    if (!edit) return;
    let value = edit.value.trim();
    if (edit.field === "time") {
      const normalized = normalizeTimeValue(value);
      if (!normalized) return;
      value = normalized;
    }
    if (edit.field === "title" && !value) {
      setEdit(null);
      return;
    }
    setPlans((current) => {
      const next = current.map((plan) => {
        if (plan.id !== edit.id) return plan;
        if (edit.field === "type") return isItineraryType(value) ? { ...plan, type: value } : plan;
        const updated = { ...plan, [edit.field]: value || undefined };
        if (edit.field === "title") onPlanRenamed(updated);
        return updated;
      });
      return edit.field === "time" ? sortItineraryItems(next) : next;
    });
    setEdit(null);
    announceSave();
  };
  return { saveInlinePlan };
}
