import { useEffect, useRef, useState } from "react";

export function useSaveStatus() {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(window.clearTimeout), []);

  const announceSave = () => {
    timers.current.forEach(window.clearTimeout);
    setStatus("saving");
    timers.current = [
      window.setTimeout(() => setStatus("saved"), 180),
      window.setTimeout(() => setStatus("idle"), 1500),
    ];
  };

  return { announceSave, saveStatus: status };
}
