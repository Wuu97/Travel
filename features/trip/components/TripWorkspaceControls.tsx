import type { ReactNode } from "react";
import { useTripCapabilities } from "./TripCapabilities";

type Tab = "plan" | "budget";
type Props = {
  activeTab: Tab;
  onCopyInvite: (role: "collaborator" | "companion") => void;
  onSelectTab: (tab: Tab) => void;
  exportButton: ReactNode;
};

export function TripWorkspaceControls({ activeTab, exportButton, onCopyInvite, onSelectTab }: Props) {
  const { canManageMembers, permissionStatus } = useTripCapabilities();
  const permissionsPending = permissionStatus === "loading";
  return (
    <div className="trip-actions">
      <button className={activeTab === "plan" ? "selected" : ""} onClick={() => onSelectTab("plan")}>攻略</button>
      <button className={activeTab === "budget" ? "selected" : ""} onClick={() => onSelectTab("budget")}>账本</button>
      {exportButton}
      {(canManageMembers || permissionsPending) && <><button aria-disabled={permissionsPending} className="share trip-invite" type="button" onClick={() => { if (!permissionsPending) onCopyInvite("collaborator"); }}>＋ 邀请协作者</button><button aria-disabled={permissionsPending} className="share trip-invite" type="button" onClick={() => { if (!permissionsPending) onCopyInvite("companion"); }}>＋ 邀请同行人</button></>}
    </div>
  );
}
