import { useEffect, useState, type RefObject } from "react";
import type { TripDetails } from "../model";
import type { TripMember } from "../members";
import { productRoleLabel } from "../members";
import { listTripMembers, removeTripMember, updateTripMemberRole } from "../api";
import { useTripCapabilities } from "./TripCapabilities";
import { IconButton } from "../../shared/components/IconButton";

type Props = { accessToken?: string | null; details: TripDetails; editingRole: string | null; isOpen: boolean; newMember?: string; onChange?: (patch: Partial<TripDetails>) => void; onNewMemberChange?: (value: string) => void; onToggle: () => void; panelRef: RefObject<HTMLDivElement | null>; roleRef: RefObject<HTMLDivElement | null>; setEditingRole: (member: string | null) => void; tripId?: string };

/** Server membership is authoritative; legacy detail roles are display-only fallback for local trips. */
export function TripMembersControl({ accessToken = null, details, editingRole, isOpen, newMember = "", onChange, onNewMemberChange, onToggle, panelRef, roleRef, setEditingRole, tripId = "" }: Props) {
  const { canManageMembers, permissionStatus } = useTripCapabilities();
  const canManage = canManageMembers && Boolean(accessToken);
  const canAddCompanion = canManageMembers;
  // The owner action keeps its slot while the permission request is pending;
  // it is inert until the server has confirmed ownership.
  const showAddCompanion = canAddCompanion || permissionStatus === "loading";
  const [members, setMembers] = useState<TripMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!isOpen || !accessToken) return;
    void listTripMembers(tripId, accessToken).then((result) => { setMembers(result.members); setError(null); }).catch((reason) => setError(reason instanceof Error ? reason.message : "无法读取成员列表。"));
  }, [accessToken, isOpen, tripId]);
  const localMembers: TripMember[] = details.companions.map((userId) => ({ userId, role: userId === "你" ? "owner" as const : details.memberRoles?.[userId] === "协作者" ? "collaborator" as const : "companion" as const, status: "active" as const, isCurrentUser: userId === "你", serverBacked: false }));
  // Server membership is authoritative for access, but local companion names
  // are itinerary data and must not disappear merely because they do not have
  // a Supabase account/membership row yet.
  const displayed: TripMember[] = members
    ? [...members, ...localMembers.filter((local) => !local.isCurrentUser && !members.some((remote) => remote.userId === local.userId))]
    : localMembers;
  const visibleMembers = displayed.slice(0, 4);
  const hiddenMemberCount = Math.max(displayed.length - visibleMembers.length, 0);
  const memberLabel = (member: TripMember) => member.isCurrentUser || member.userId === "你" ? "你" : details.companions.includes(member.userId) ? member.userId : `成员 ${member.userId.slice(0, 8)}`;
  const changeRole = async (member: TripMember, role: "collaborator" | "companion") => {
    if (!accessToken || !canManage || !member.serverBacked) return;
    try { await updateTripMemberRole(tripId, member.userId, role, accessToken); setMembers((current) => current?.map((item) => item.userId === member.userId ? { ...item, role } : item) || null); setEditingRole(null); } catch (reason) { setError(reason instanceof Error ? reason.message : "无法更新成员角色。"); }
  };
  const remove = async (member: TripMember) => {
    if (!accessToken || !canManage || !member.serverBacked) return;
    try { await removeTripMember(tripId, member.userId, accessToken); setMembers((current) => current?.filter((item) => item.userId !== member.userId) || null); } catch (reason) { setError(reason instanceof Error ? reason.message : "无法移除成员。"); }
  };
  const addCompanion = () => {
    const name = newMember.trim();
    if (!canAddCompanion || !name || details.companions.includes(name)) return;
    onChange?.({
      companions: [...details.companions, name],
      memberRoles: { ...details.memberRoles, [name]: "同行人" },
    });
    onNewMemberChange?.("");
  };
  return <div className="avatars member-control" ref={isOpen ? panelRef : null}>
    <button className="avatar-group-trigger" type="button" aria-label="查看成员" aria-expanded={isOpen} onClick={onToggle}>{visibleMembers.map((member) => <i key={member.userId}>{memberLabel(member).slice(0, 1)}</i>)}{hiddenMemberCount > 0 && <em className="member-overflow-count" aria-label={`还有 ${hiddenMemberCount} 位同行人`}>+{hiddenMemberCount}</em>}</button>
    {showAddCompanion && <span className="add-member-avatar"><IconButton aria-label="添加同行人" disabled={!canAddCompanion} icon="plus" size="sm" title="添加同行人" variant="ghost" onClick={onToggle} /></span>}
    {isOpen && <div className="trip-popover member-popover"><b>成员管理</b>{error && <p className="member-role-note" role="status">{error}</p>}{displayed.map((member) => <div className="member-row" key={member.userId}><span title={member.isCurrentUser ? "你" : member.userId}>{memberLabel(member)}</span>{member.role === "owner" ? <small>所有者</small> : canManage && member.serverBacked ? <div className="member-role-control" ref={editingRole === member.userId ? roleRef : null}><button className="member-role-label" type="button" aria-expanded={editingRole === member.userId} onClick={() => setEditingRole(member.userId)}>{productRoleLabel(member.role)}<span aria-hidden="true">⌄</span></button>{editingRole === member.userId && <div className="member-role-menu" role="menu">{(["collaborator", "companion"] as const).map((role) => <button key={role} type="button" role="menuitem" className={member.role === role ? "selected" : ""} onClick={() => void changeRole(member, role)}>{productRoleLabel(role)}</button>)}</div>}</div> : <small>{productRoleLabel(member.role)}</small>}{canManage && member.serverBacked && member.role !== "owner" && <IconButton aria-label={`移除${memberLabel(member)}`} icon="trash" variant="danger" onClick={() => void remove(member)} />}</div>)}{canAddCompanion && <div className="member-add"><form onSubmit={(event) => { event.preventDefault(); addCompanion(); }}><input value={newMember} aria-label="同行人姓名" placeholder="输入同行人姓名" onChange={(event) => onNewMemberChange?.(event.target.value)} /><button type="submit" aria-label="添加同行人">添加</button></form></div>}<p className="member-role-note">协作者可编辑；同行人仅可查看。</p></div>}
  </div>;
}
