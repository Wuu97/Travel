import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "link" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}

/** Shared text-action primitive. Icon-only controls belong to IconButton. */
export function Button({ children, className, disabled, loading = false, size = "md", variant = "primary", ...props }: ButtonProps) {
  const classes = ["button", `button--${variant}`, `button--${size}`, className].filter(Boolean).join(" ");
  return <button {...props} aria-busy={loading || undefined} className={classes} disabled={disabled || loading}>{loading && <span aria-hidden="true" className="button__spinner" />}<span className="button__content">{children}</span></button>;
}
