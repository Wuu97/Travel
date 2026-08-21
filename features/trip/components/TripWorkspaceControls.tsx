import type { RefObject } from "react";

type Tab = "plan" | "budget";
type Props = {
  activeTab: Tab;
  containerRef: RefObject<HTMLDivElement | null>;
  isSettingsOpen: boolean;
  onArchive: () => void;
  onCopyInvite: () => void;
  onDelete: () => void;
  onOpenCoverPicker: () => void;
  onOpenMembers: () => void;
  onSelectTab: (tab: Tab) => void;
  onToggleSettings: () => void;
};

export function TripWorkspaceControls({ activeTab, onCopyInvite, onSelectTab }: Props) {
  return (
    <div className="trip-actions">
      <button className={activeTab === "plan" ? "selected" : ""} onClick={() => onSelectTab("plan")}>攻略</button>
      <button className={activeTab === "budget" ? "selected" : ""} onClick={() => onSelectTab("budget")}>账本</button>
      <button className="settings-trigger" type="button" onClick={() => window.print()}>导出行程</button>
      <button className="share trip-invite" type="button" onClick={onCopyInvite}>＋ 邀请协作者</button>
    </div>
  );
}
