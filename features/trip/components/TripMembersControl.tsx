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
    if (name && !details.companions.includes(name)) onChange({ companions: [...details.companions, name], memberRoles: { ...details.memberRoles, [name]: "同行人" } });
    onNewMemberChange("");
  };
  const members = [...details.companions].sort((left, right) => {
    const rank = (member: string) => member === "你" ? 0 : details.memberRoles?.[member] === "协作者" ? 1 : 2;
    return rank(left) - rank(right);
  });
  return (
    <div className="avatars member-control" ref={isOpen ? panelRef : null}>
      <button className="avatar-group-trigger" type="button" aria-label="管理同行人" aria-expanded={isOpen} onClick={onToggle}>
        {details.companions.slice(0, 6).map((member) => <i key={member}>{member.slice(0, 1)}</i>)}
        <span className="member-overflow-count" style={{ alignItems: "center", background: "#fff", border: "1px solid #cddbd2", borderRadius: "50%", color: "#557065", display: "inline-flex", flex: "0 0 23px", fontSize: "12px", fontWeight: 600, height: "23px", justifyContent: "center", lineHeight: 1, marginLeft: "3px", width: "23px" }}>{details.companions.length > 6 ? `+${details.companions.length - 6}` : "+"}</span>
      </button>
      {isOpen && <div className="trip-popover member-popover">
        <b>成员管理</b>
        {members.map((member) => <div className="member-row" key={member}>
          <span>{member}</span>
          {member === "你" ? <small>所有者</small> : <div className="member-role-control" ref={editingRole === member ? roleRef : null}>
            <button className="member-role-label" type="button" title="点击修改身份" aria-expanded={editingRole === member} onClick={() => setEditingRole(member)}>{details.memberRoles?.[member] || "同行人"}<span aria-hidden="true">⌄</span></button>
            {editingRole === member && <div className="member-role-menu" role="menu">{(["协作者", "同行人"] as const).map((role) => <button key={role} type="button" role="menuitem" className={(details.memberRoles?.[member] || "同行人") === role ? "selected" : ""} onClick={() => { onChange({ memberRoles: { ...details.memberRoles, [member]: role } }); setEditingRole(null); }}>{role}</button>)}</div>}
          </div>}
          {member !== "你" && <button type="button" aria-label={`移除${member}`} onClick={() => { const memberRoles = { ...details.memberRoles }; delete memberRoles[member]; onChange({ companions: details.companions.filter((name) => name !== member), memberRoles }); }}>×</button>}
        </div>)}
        <p className="member-role-note">同行人可查看行程，不可编辑。</p>
        <form onSubmit={(event) => { event.preventDefault(); addMember(); }}><input value={newMember} onChange={(event) => onNewMemberChange(event.target.value)} placeholder="输入同行人姓名" /><button type="submit">添加同行人</button></form>
      </div>}
    </div>
  );
}
