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

export function TripWorkspaceControls({ activeTab, containerRef, isSettingsOpen, onCopyInvite, onSelectTab, onToggleSettings }: Props) {
  return (
    <div className="trip-actions" ref={isSettingsOpen ? containerRef : null}>
      <button className={activeTab === "plan" ? "selected" : ""} onClick={() => onSelectTab("plan")}>攻略</button>
      <button className={activeTab === "budget" ? "selected" : ""} onClick={() => onSelectTab("budget")}>账本</button>
      <button className="settings-trigger" type="button" onClick={onToggleSettings}>协作与导出</button>
      {isSettingsOpen && <div className="trip-popover settings-popover"><button onClick={onCopyInvite}>复制协作邀请链接</button><button onClick={() => window.print()}>导出 PDF</button></div>}
    </div>
  );
}
