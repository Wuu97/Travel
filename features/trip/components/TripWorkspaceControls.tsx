import type { ReactNode } from "react";

type Tab = "plan" | "budget";
type Props = {
  activeTab: Tab;
  onCopyInvite: () => void;
  onSelectTab: (tab: Tab) => void;
  exportButton: ReactNode;
};

export function TripWorkspaceControls({ activeTab, exportButton, onCopyInvite, onSelectTab }: Props) {
  return (
    <div className="trip-actions">
      <button className={activeTab === "plan" ? "selected" : ""} onClick={() => onSelectTab("plan")}>攻略</button>
      <button className={activeTab === "budget" ? "selected" : ""} onClick={() => onSelectTab("budget")}>账本</button>
      {exportButton}
      <button className="share trip-invite" type="button" onClick={onCopyInvite}>＋ 邀请协作者</button>
    </div>
  );
}
