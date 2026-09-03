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
  return <span className={className}><IconButton aria-expanded={!collapsed} aria-label={label} icon="menu" size="sm" title={label} variant="ghost" onClick={onToggle} /></span>;
}
import { IconButton } from "./IconButton";
