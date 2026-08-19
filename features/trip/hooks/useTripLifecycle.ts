import { deleteSharedTrip } from "../api";
import type { TripDetails } from "../model";
import { copyText } from "../../shared/utils/copyText";

type Options = { disableRemoteSync: () => void; onReset: () => void; onStatusChange: (patch: Partial<TripDetails>) => void; onClosePopover: () => void; setShareStatus: (value: "copied" | "failed") => void; setShared: (value: boolean) => void; tripId: string };

/** Owns user-facing trip lifecycle operations that span local and shared storage. */
export function useTripLifecycle({ disableRemoteSync, onClosePopover, onReset, onStatusChange, setShareStatus, setShared, tripId }: Options) {
  const copyInviteLink = async () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?trip=${encodeURIComponent(tripId)}`;
    try {
      await copyText(inviteUrl);
      setShareStatus("copied");
    } catch {
      setShareStatus("failed");
    }
    setShared(true);
  };
  const archiveTrip = () => {
    if (!window.confirm("归档后将标记为已结束，仍可随时查看和恢复编辑。确定归档吗？")) return;
    onStatusChange({ status: "已结束" });
    onClosePopover();
  };
  const deleteTrip = async () => {
    if (!window.confirm("确定删除此行程吗？本地和共享数据将被清除，此操作无法撤销。")) return;
    try {
      await deleteSharedTrip(tripId);
    } catch {
      // Local-only trips remain removable when shared storage is unavailable.
    }
    disableRemoteSync();
    onReset();
    onClosePopover();
  };
  return { archiveTrip, copyInviteLink, deleteTrip };
}
