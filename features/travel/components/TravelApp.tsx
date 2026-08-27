"use client";

import { ConfirmDialogProvider } from "../../shared/components/ConfirmDialog";
import { TravelAppContent } from "./TravelAppContent";
import { useClientMounted } from "../../shared/hooks/useClientMounted";

export function TravelApp({ initialAccountLabel = null }: { initialAccountLabel?: string | null }) {
  const mounted = useClientMounted();
  return (
    <ConfirmDialogProvider><TravelAppContent
      loadPersistedState={mounted}
      initialAccountLabel={initialAccountLabel}
    /></ConfirmDialogProvider>
  );
}
