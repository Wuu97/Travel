import { useEffect } from "react";
import { useOutsideClick } from "../../shared/hooks/useOutsideClick";

type Options = {
  editingMemberRole: string | null;
  historyOpen: boolean;
  inlineEditorRef: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  inlinePlanEdit: unknown | null;
  inlineTripTitle: string | null;
  memberRoleRef: React.RefObject<HTMLDivElement | null>;
  onCloseHistory: () => void;
  onCloseMemberRole: () => void;
  onClosePlanMenu: () => void;
  onCloseTripPopover: () => void;
  openPlanMenuId: string | null;
  planMenuRef: React.RefObject<HTMLDivElement | null>;
  tripPopover: string | null;
  tripPopoverRef: React.RefObject<HTMLDivElement | null>;
  historyPanelRef: React.RefObject<HTMLDivElement | null>;
};

/** Centralizes ephemeral popover dismissal and inline-editor focus management. */
export function useWorkspaceOverlays(options: Options) {
  const { editingMemberRole, historyOpen, historyPanelRef, inlineEditorRef, inlinePlanEdit, inlineTripTitle, memberRoleRef, onCloseHistory, onCloseMemberRole, onClosePlanMenu, onCloseTripPopover, openPlanMenuId, planMenuRef, tripPopover, tripPopoverRef } = options;
  useOutsideClick(historyPanelRef, historyOpen, onCloseHistory);
  useOutsideClick(planMenuRef, Boolean(openPlanMenuId), onClosePlanMenu);
  useOutsideClick(tripPopoverRef, Boolean(tripPopover), onCloseTripPopover);
  useOutsideClick(memberRoleRef, Boolean(editingMemberRole), onCloseMemberRole);
  useEffect(() => {
    if (inlineTripTitle === null && !inlinePlanEdit) return;
    const frame = requestAnimationFrame(() => inlineEditorRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [inlineEditorRef, inlinePlanEdit, inlineTripTitle]);
}
