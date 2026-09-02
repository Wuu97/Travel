import type { ButtonHTMLAttributes } from "react";
import { ICON_REGISTRY, type IconName } from "../icons/registry";

type Variant = "ghost" | "danger" | "edit";
type Size = "sm" | "md";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
  "aria-label": string;
  icon: IconName;
  size?: Size;
  variant: Variant;
};

/** Shared icon-only control for non-content actions such as closing dialogs and deleting objects. */
export function IconButton({ icon, size = "sm", variant, ...props }: Props) {
  const Icon = ICON_REGISTRY[icon];
  return <button {...props} className={`icon-button icon-button--${variant} icon-button--${size}`} type={props.type ?? "button"}><Icon /></button>;
}
