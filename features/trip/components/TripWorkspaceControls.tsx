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

export function TripWorkspaceControls({ activeTab, containerRef, isSettingsOpen, onArchive, onCopyInvite, onDelete, onOpenCoverPicker, onOpenMembers, onSelectTab, onToggleSettings }: Props) {
  return (
    <div className="trip-actions" ref={isSettingsOpen ? containerRef : null}>
      <button className="settings-trigger" type="button" onClick={onToggleSettings}>设置</button>
      {isSettingsOpen && <div className="trip-popover settings-popover"><button onClick={onOpenCoverPicker}>更换封面</button><button onClick={onCopyInvite}>复制分享链接</button><button onClick={() => window.print()}>导出 PDF</button><button onClick={onOpenMembers}>权限管理</button><button onClick={onArchive}>归档旅程</button><button className="danger" onClick={onDelete}>删除旅程</button></div>}
      <button className={activeTab === "plan" ? "selected" : ""} onClick={() => onSelectTab("plan")}>攻略</button>
      <button className={activeTab === "budget" ? "selected" : ""} onClick={() => onSelectTab("budget")}>账本 & 预算</button>
    </div>
  );
}
