import { useEffect, useState, type RefObject } from "react";
import type { TripDetails } from "../model";
import type { TripMember } from "../members";
import { productRoleLabel } from "../members";
import { listTripMembers, removeTripMember, updateTripMemberRole } from "../api";
import { useTripCapabilities } from "./TripCapabilities";

type Props = { accessToken?: string | null; details: TripDetails; editingRole: string | null; isOpen: boolean; newMember?: string; onChange?: (patch: Partial<TripDetails>) => void; onNewMemberChange?: (value: string) => void; onToggle: () => void; panelRef: RefObject<HTMLDivElement | null>; roleRef: RefObject<HTMLDivElement | null>; setEditingRole: (member: string | null) => void; tripId?: string };

/** Server membership is authoritative; legacy detail roles are display-only fallback for local trips. */
export function TripMembersControl({ accessToken = null, details, editingRole, isOpen, onToggle, panelRef, roleRef, setEditingRole, tripId = "" }: Props) {
  const { canManageMembers } = useTripCapabilities();
  const canManage = canManageMembers && Boolean(accessToken);
  const [members, setMembers] = useState<TripMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!isOpen || !accessToken) return;
    void listTripMembers(tripId, accessToken).then((result) => { setMembers(result.members); setError(null); }).catch((reason) => setError(reason instanceof Error ? reason.message : "无法读取成员列表。"));
  }, [accessToken, isOpen, tripId]);
  const displayed = members || details.companions.map((userId) => ({ userId, role: userId === "你" ? "owner" as const : details.memberRoles?.[userId] === "协作者" ? "collaborator" as const : "companion" as const, status: "active" as const }));
  const changeRole = async (member: TripMember, role: "collaborator" | "companion") => {
    if (!accessToken || !canManage) return;
    try { await updateTripMemberRole(tripId, member.userId, role, accessToken); setMembers((current) => current?.map((item) => item.userId === member.userId ? { ...item, role } : item) || null); setEditingRole(null); } catch (reason) { setError(reason instanceof Error ? reason.message : "无法更新成员角色。"); }
  };
  const remove = async (member: TripMember) => {
    if (!accessToken || !canManage) return;
    try { await removeTripMember(tripId, member.userId, accessToken); setMembers((current) => current?.filter((item) => item.userId !== member.userId) || null); } catch (reason) { setError(reason instanceof Error ? reason.message : "无法移除成员。"); }
  };
  return <div className="avatars member-control" ref={isOpen ? panelRef : null}>
    <button className="avatar-group-trigger" type="button" aria-label="查看成员" aria-expanded={isOpen} onClick={onToggle}>{displayed.slice(0, 6).map((member) => <i key={member.userId}>{member.userId.slice(0, 1)}</i>)}</button>
    {isOpen && <div className="trip-popover member-popover"><b>成员管理</b>{error && <p className="member-role-note" role="status">{error}</p>}{displayed.map((member) => <div className="member-row" key={member.userId}><span title={member.userId}>{member.userId}</span>{member.role === "owner" ? <small>所有者</small> : canManage ? <div className="member-role-control" ref={editingRole === member.userId ? roleRef : null}><button className="member-role-label" type="button" aria-expanded={editingRole === member.userId} onClick={() => setEditingRole(member.userId)}>{productRoleLabel(member.role)}<span aria-hidden="true">⌄</span></button>{editingRole === member.userId && <div className="member-role-menu" role="menu">{(["collaborator", "companion"] as const).map((role) => <button key={role} type="button" role="menuitem" className={member.role === role ? "selected" : ""} onClick={() => void changeRole(member, role)}>{productRoleLabel(role)}</button>)}</div>}</div> : <small>{productRoleLabel(member.role)}</small>}{canManage && member.role !== "owner" && <button type="button" aria-label={`移除${member.userId}`} onClick={() => void remove(member)}>×</button>}</div>)}<p className="member-role-note">协作者可编辑；同行人仅可查看。成员权限以服务器为准。</p></div>}
  </div>;
}
