import { useEffect, type RefObject } from "react";

export function useChatScroll(
  chatArea: RefObject<HTMLDivElement | null>,
  dependency: unknown,
  isBusy: boolean,
) {
  useEffect(() => {
    if (!chatArea.current) return;
    requestAnimationFrame(() =>
      chatArea.current?.scrollTo({ top: chatArea.current.scrollHeight, behavior: "smooth" }),
    );
  }, [chatArea, dependency, isBusy]);
}
