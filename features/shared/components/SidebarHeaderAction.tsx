import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

/** Compact text action shared by sidebar heading rows. */
export function SidebarHeaderAction({ children, className, type = "button", ...props }: Props) {
  const classes = ["sidebar-header-action", className].filter(Boolean).join(" ");
  return <button {...props} className={classes} type={type}>{children}</button>;
}
