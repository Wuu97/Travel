import { useEffect } from "react";
import { useOutsideClick } from "../../shared/hooks/useOutsideClick";

type Options = {
  editingMemberRole: string | null;
  inlineTitleInputRef: React.RefObject<HTMLInputElement | null>;
  inlinePlanInputRef: React.RefObject<HTMLInputElement | null>;
  inlinePlanTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  inlinePlanEdit: { field: "title" | "note" | "time" | "type" } | null;
  inlineTripTitle: string | null;
  memberRoleRef: React.RefObject<HTMLDivElement | null>;
  onCloseMemberRole: () => void;
  onClosePlanMenu: () => void;
  onCloseTripPopover: () => void;
  openPlanMenuId: string | null;
  planMenuRef: React.RefObject<HTMLDivElement | null>;
  tripPopover: string | null;
  tripPopoverRef: React.RefObject<HTMLDivElement | null>;
};

/** Centralizes ephemeral popover dismissal and inline-editor focus management. */
export function useWorkspaceOverlays(options: Options) {
  const { editingMemberRole, inlineTitleInputRef, inlinePlanInputRef, inlinePlanTextareaRef, inlinePlanEdit, inlineTripTitle, memberRoleRef, onCloseMemberRole, onClosePlanMenu, onCloseTripPopover, openPlanMenuId, planMenuRef, tripPopover, tripPopoverRef } = options;
  useOutsideClick(planMenuRef, Boolean(openPlanMenuId), onClosePlanMenu);
  useOutsideClick(tripPopoverRef, Boolean(tripPopover), onCloseTripPopover);
  useOutsideClick(memberRoleRef, Boolean(editingMemberRole), onCloseMemberRole);
  useEffect(() => {
    if (inlineTripTitle === null && !inlinePlanEdit) return;
    const frame = requestAnimationFrame(() => (inlineTripTitle !== null ? inlineTitleInputRef : inlinePlanEdit?.field === "note" ? inlinePlanTextareaRef : inlinePlanInputRef).current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [inlinePlanInputRef, inlinePlanTextareaRef, inlinePlanEdit, inlineTitleInputRef, inlineTripTitle]);
}
