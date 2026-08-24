"use client";

import type { ReactNode } from "react";

type Props = { children: ReactNode; collapsed: boolean; header: ReactNode; sidebar: ReactNode };

/** Stable workspace shell shared by every trip-management view. */
export function TripWorkspaceLayout({ children, collapsed, header, sidebar }: Props) {
  return <section className="workspace" id="workspace"><div className="shell trip-workspace-shell">{header}<div className={`trip-workbench ${collapsed ? "is-sidebar-collapsed" : ""}`}><aside className="trip-workbench-sidebar">{sidebar}</aside><div className="trip-workbench-main"><div className="shell">{children}</div></div></div></div></section>;
}
