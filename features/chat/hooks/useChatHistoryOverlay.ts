import type { Dispatch, RefObject, SetStateAction } from "react";
import { useOutsideClick } from "../../shared/hooks/useOutsideClick";

/** Closes the chat history panel when its open surface loses focus. */
export function useChatHistoryOverlay(
  historyOpen: boolean,
  historyPanelRef: RefObject<HTMLDivElement | null>,
  setHistoryOpen: Dispatch<SetStateAction<boolean>>,
) {
  useOutsideClick(historyPanelRef, historyOpen, () => setHistoryOpen(false));
}
