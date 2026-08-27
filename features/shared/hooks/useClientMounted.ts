import { useEffect, useState } from "react";

/** Keeps server and first client render on the same neutral bootstrap state. */
export function useClientMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // This is the intentional post-hydration boundary for browser-only state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);
  return mounted;
}
