import type { RefObject } from "react";
import type { TripDetails } from "../model";

type Props = {
  details: TripDetails;
  editingRole: string | null;
  isOpen: boolean;
  newMember: string;
  onChange: (patch: Partial<TripDetails>) => void;
  onNewMemberChange: (value: string) => void;
  onToggle: () => void;
  setEditingRole: (member: string | null) => void;
  panelRef: RefObject<HTMLDivElement | null>;
  roleRef: RefObject<HTMLDivElement | null>;
};

export function TripMembersControl({ details, editingRole, isOpen, newMember, onChange, onNewMemberChange, onToggle, panelRef, roleRef, setEditingRole }: Props) {
  const addMember = () => {
    const name = newMember.trim();
    if (name && !details.companions.includes(name)) onChange({ companions: [...details.companions, name] });
    onNewMemberChange("");
  };
  return (
    <div className="avatars member-control" ref={isOpen ? panelRef : null}>
      <button className="avatar-group-trigger" type="button" aria-label="管理同行人" aria-expanded={isOpen} onClick={onToggle}>
        {details.companions.slice(0, 6).map((member) => <i key={member}>{member.slice(0, 1)}</i>)}
        <em className={details.companions.length > 6 ? "more-members" : undefined}>{details.companions.length > 6 ? `+${details.companions.length - 6}` : "+"}</em>
      </button>
      {isOpen && <div className="trip-popover member-popover">
        <b>同行人</b>
        {details.companions.map((member) => <div className="member-row" key={member}>
          <span>{member}</span>
          {member === "你" ? <small>所有者</small> : <div className="member-role-control" ref={editingRole === member ? roleRef : null}>
            <button className="member-role-label" type="button" title="点击修改权限" aria-expanded={editingRole === member} onClick={() => setEditingRole(member)}>{details.memberRoles?.[member] || "编辑者"}<span aria-hidden="true">⌄</span></button>
            {editingRole === member && <div className="member-role-menu" role="menu">{(["编辑者", "查看者"] as const).map((role) => <button key={role} type="button" role="menuitem" className={(details.memberRoles?.[member] || "编辑者") === role ? "selected" : ""} onClick={() => { onChange({ memberRoles: { ...details.memberRoles, [member]: role } }); setEditingRole(null); }}>{role}</button>)}</div>}
          </div>}
          {member !== "你" && <button type="button" aria-label={`移除${member}`} onClick={() => onChange({ companions: details.companions.filter((name) => name !== member) })}>×</button>}
        </div>)}
        <form onSubmit={(event) => { event.preventDefault(); addMember(); }}><input value={newMember} onChange={(event) => onNewMemberChange(event.target.value)} placeholder="添加同行人" /><button type="submit">添加</button></form>
      </div>}
    </div>
  );
}
