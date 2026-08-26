import { createTripInvite } from "../api";
import type { TripDetails } from "../model";
import { copyText } from "../../shared/utils/copyText";
import { useConfirmation } from "../../shared/components/ConfirmDialog";

type Options = { accessToken: string | null; onStatusChange: (patch: Partial<TripDetails>) => void; onClosePopover: () => void; setShareStatus: (value: "copied" | "failed") => void; setShared: (value: boolean) => void; tripId: string };

/** Owns user-facing trip lifecycle operations that span local and shared storage. */
export function useTripLifecycle({ accessToken, onClosePopover, onStatusChange, setShareStatus, setShared, tripId }: Options) {
  const { confirm } = useConfirmation();
  const copyInviteLink = async (role: "collaborator" | "companion" = "collaborator") => {
    try {
      if (!accessToken) throw new Error("请先登录后再邀请协作者。");
      const token = await createTripInvite(tripId, accessToken, role);
      const inviteUrl = `${window.location.origin}${window.location.pathname}?trip=${encodeURIComponent(tripId)}&invite=${encodeURIComponent(token)}`;
      await copyText(inviteUrl);
      setShareStatus("copied");
    } catch {
      setShareStatus("failed");
    }
    setShared(true);
  };
  const archiveTrip = async () => {
    if (!await confirm({ confirmLabel: "确认归档", title: "归档行程？", description: "归档后将标记为已结束，仍可随时查看和恢复编辑。" })) return;
    onStatusChange({ status: "已结束" });
    onClosePopover();
  };
  return { archiveTrip, copyInviteLink };
}
