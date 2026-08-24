type Props = {
  className: string;
  collapsed: boolean;
  collapseLabel: string;
  expandLabel: string;
  onToggle: () => void;
};

/** Shared, accessible toggle for controlled collapsible sidebars. */
export function SidebarCollapseButton({ className, collapsed, collapseLabel, expandLabel, onToggle }: Props) {
  const label = collapsed ? expandLabel : collapseLabel;
  return <button aria-expanded={!collapsed} aria-label={label} className={className} title={label} type="button" onClick={onToggle}>☰</button>;
}
