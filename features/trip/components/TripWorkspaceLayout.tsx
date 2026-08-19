import type { ReactNode } from "react";

type Props = { children: ReactNode; header: ReactNode };

/** Stable workspace shell shared by every trip-management view. */
export function TripWorkspaceLayout({ children, header }: Props) {
  return <section className="workspace" id="workspace" style={{ paddingBottom: 40, paddingTop: 40 }}><div className="shell">{header}{children}</div></section>;
}
