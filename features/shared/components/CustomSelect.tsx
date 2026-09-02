"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type ReactElement, type Ref } from "react";
import { createPortal } from "react-dom";

export type CustomSelectOption = { label: string; value: string; disabled?: boolean };

type Props = {
  ariaLabel: string;
  className?: string;
  disabled?: boolean;
  menuClassName?: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  renderTrigger?: (args: { triggerProps: ButtonHTMLAttributes<HTMLButtonElement>; triggerRef: Ref<HTMLButtonElement>; open: boolean; selectedOption?: CustomSelectOption }) => ReactElement;
  value: string;
};

type MenuPosition = { left: number; top: number; width: number };

/** Shared interaction layer. Custom triggers stay in their original DOM slot; menus render in the top overlay layer. */
export function CustomSelect({ ariaLabel, className = "", disabled = false, menuClassName = "", onChange, options, placeholder = "请选择", renderTrigger, value }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options.find((option) => option.value === value);
  const enabledIndexes = options.flatMap((option, index) => option.disabled ? [] : [index]);

  const close = (returnFocus = false) => { setOpen(false); setMenuPosition(null); if (returnFocus) triggerRef.current?.focus(); };
  const openAt = (index = selectedIndex) => { if (disabled) return; setActiveIndex(index); setMenuPosition(null); setOpen(true); };
  const move = (direction: 1 | -1) => {
    if (!enabledIndexes.length) return;
    const current = enabledIndexes.indexOf(activeIndex);
    setActiveIndex(enabledIndexes[(current < 0 ? (direction > 0 ? -1 : 0) : current + direction + enabledIndexes.length) % enabledIndexes.length]);
  };
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    close(true);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target) || rootRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onScroll = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      close();
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", onScroll, true);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current || !menuRef.current) return;
    const trigger = triggerRef.current.getBoundingClientRect();
    const menu = menuRef.current.getBoundingClientRect();
    const gutter = 8;
    const width = Math.max(trigger.width, menu.width);
    const left = Math.max(gutter, Math.min(trigger.left, window.innerWidth - width - gutter));
    const opensUp = trigger.bottom + 5 + menu.height > window.innerHeight - gutter && trigger.top > menu.height + gutter;
    setMenuPosition({ left, top: opensUp ? Math.max(gutter, trigger.top - menu.height - 5) : Math.min(window.innerHeight - menu.height - gutter, trigger.bottom + 5), width });
  }, [open, options.length]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); if (!open) openAt(selectedIndex); else move(event.key === "ArrowDown" ? 1 : -1); return; }
    if (event.key === "Home" || event.key === "End") { event.preventDefault(); const index = event.key === "Home" ? enabledIndexes[0] : enabledIndexes.at(-1) || 0; if (!open) openAt(index); else setActiveIndex(index); return; }
    if (event.key === "Escape" && open) { event.preventDefault(); close(true); return; }
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (open) choose(activeIndex); else openAt(selectedIndex); }
  };

  const triggerProps: ButtonHTMLAttributes<HTMLButtonElement> = { "aria-controls": listId, "aria-expanded": open, "aria-haspopup": "listbox", "aria-label": ariaLabel, disabled, type: "button", onClick: () => open ? close() : openAt(selectedIndex), onKeyDown };
  const menu = open && typeof document !== "undefined" ? createPortal(<div aria-label={ariaLabel} className={`custom-select-menu ${menuClassName}`} id={listId} ref={menuRef} role="listbox" style={menuPosition ? { left: menuPosition.left, top: menuPosition.top, minWidth: menuPosition.width, visibility: "visible" } : { left: -10_000, top: -10_000, visibility: "hidden" }}>{options.map((option, index) => <button aria-selected={option.value === value} className={`${option.value === value ? "is-selected " : ""}${index === activeIndex ? "is-active" : ""}`} disabled={option.disabled} key={option.value} role="option" type="button" onKeyDown={onKeyDown} onMouseEnter={() => !option.disabled && setActiveIndex(index)} onClick={() => choose(index)}>{option.label}</button>)}</div>, document.body) : null;

  if (renderTrigger) return <>{renderTrigger({ triggerProps, triggerRef, open, selectedOption: selected })}{menu}</>;
  return <div className={`custom-select ${className}${open ? " is-open" : ""}`} ref={rootRef}><button {...triggerProps} className="custom-select-trigger" ref={triggerRef}><span>{selected?.label || placeholder}</span><i aria-hidden="true" /></button>{menu}</div>;
}
