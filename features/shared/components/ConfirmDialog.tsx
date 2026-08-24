"use client";

import { createContext, useContext, useRef, useState, type ReactNode } from "react";

type Props = {
  confirmLabel?: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  open: boolean;
  title: string;
};

/** Reusable in-app confirmation dialog for irreversible actions. */
export function ConfirmDialog({ confirmLabel = "确认删除", description, onCancel, onConfirm, open, title }: Props) {
  if (!open) return null;
  return <div aria-labelledby="confirm-dialog-title" aria-modal="true" className="confirm-dialog-backdrop" role="dialog"><button aria-label="取消" className="confirm-dialog-dismiss" type="button" onClick={onCancel} /><section className="confirm-dialog"><h2 id="confirm-dialog-title">{title}</h2><p>{description}</p><footer><button type="button" onClick={onCancel}>取消</button><button className="confirm-dialog-danger" type="button" onClick={onConfirm}>{confirmLabel}</button></footer></section></div>;
}

type ConfirmOptions = { confirmLabel?: string; description: string; title: string };
type ConfirmContextValue = { confirm: (options: ConfirmOptions) => Promise<boolean> };
const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const confirm = (next: ConfirmOptions) => new Promise<boolean>((resolve) => { resolveRef.current = resolve; setOptions(next); });
  const close = (confirmed: boolean) => { resolveRef.current?.(confirmed); resolveRef.current = null; setOptions(null); };
  return <ConfirmContext.Provider value={{ confirm }}>{children}<ConfirmDialog confirmLabel={options?.confirmLabel} description={options?.description || ""} onCancel={() => close(false)} onConfirm={() => close(true)} open={Boolean(options)} title={options?.title || ""} /></ConfirmContext.Provider>;
}

export function useConfirmation() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirmation must be used within ConfirmDialogProvider");
  return context;
}
