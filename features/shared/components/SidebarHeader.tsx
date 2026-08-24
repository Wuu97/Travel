import type { ReactNode } from "react";

type Props = {
  action?: ReactNode;
  collapseButton: ReactNode;
  className?: string;
  title: string;
};

/** Consistent heading row for sidebars with a title, collapse control, and optional action. */
export function SidebarHeader({ action, collapseButton, className = "", title }: Props) {
  return <div className={`sidebar-header ${className}`.trim()}>{collapseButton}<b className="sidebar-header-title">{title}</b>{action}</div>;
}
