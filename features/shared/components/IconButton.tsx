import type { ButtonHTMLAttributes } from "react";

type Icon = "close" | "trash";
type Variant = "ghost" | "danger";
type Size = "sm" | "md";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  "aria-label": string;
  icon: Icon;
  size?: Size;
  variant: Variant;
};

function IconGlyph({ icon }: Pick<Props, "icon">) {
  if (icon === "trash") return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6m4-6v6M9 7l1-3h4l1 3m-8 0 1 13h8l1-13" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m7 7 10 10M17 7 7 17" /></svg>;
}

/** Shared icon-only control for non-content actions such as closing dialogs and deleting objects. */
export function IconButton({ className = "", icon, size = "sm", variant, ...props }: Props) {
  return <button {...props} className={`icon-button icon-button--${variant} icon-button--${size}${className ? ` ${className}` : ""}`} type={props.type ?? "button"}><IconGlyph icon={icon} /></button>;
}
