import { useEffect } from "react";
import { useOutsideClick } from "../../shared/hooks/useOutsideClick";

type Options = {
  editingMemberRole: string | null;
  inlineTitleInputRef: React.RefObject<HTMLInputElement | null>;
  inlinePlanInputRef: React.RefObject<HTMLInputElement | null>;
  inlinePlanTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  inlinePlanEdit: { id: string; field: "title" | "note" | "time" | "type" } | null;
  inlineTripTitle: string | null;
  memberRoleRef: React.RefObject<HTMLDivElement | null>;
  onCloseMemberRole: () => void;
  onCloseTripPopover: () => void;
  tripPopover: string | null;
  tripPopoverRef: React.RefObject<HTMLDivElement | null>;
};

/** Centralizes ephemeral popover dismissal and inline-editor focus management. */
export function useWorkspaceOverlays(options: Options) {
  const { editingMemberRole, inlineTitleInputRef, inlinePlanInputRef, inlinePlanTextareaRef, inlinePlanEdit, inlineTripTitle, memberRoleRef, onCloseMemberRole, onCloseTripPopover, tripPopover, tripPopoverRef } = options;
  const inlinePlanEditKey = inlinePlanEdit ? `${inlinePlanEdit.id}:${inlinePlanEdit.field}` : null;
  const inlineTripTitleActive = inlineTripTitle !== null;
  useOutsideClick(tripPopoverRef, Boolean(tripPopover), onCloseTripPopover);
  useOutsideClick(memberRoleRef, Boolean(editingMemberRole), onCloseMemberRole);
  useEffect(() => {
    if (!inlineTripTitleActive && !inlinePlanEditKey) return;
    const frame = requestAnimationFrame(() => (inlineTripTitleActive ? inlineTitleInputRef : inlinePlanEdit?.field === "note" ? inlinePlanTextareaRef : inlinePlanInputRef).current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [inlinePlanInputRef, inlinePlanTextareaRef, inlinePlanEditKey, inlineTitleInputRef, inlineTripTitleActive]);
}
