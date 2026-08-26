export type TripMemberRole = "owner" | "collaborator" | "companion";
export type TripMember = { userId: string; role: TripMemberRole; status: "active" };

export const membershipRoleToProductRole = (role: "editor" | "viewer"): TripMemberRole => role === "editor" ? "collaborator" : "companion";
export const productRoleToMembershipRole = (role: Exclude<TripMemberRole, "owner">): "editor" | "viewer" => role === "collaborator" ? "editor" : "viewer";
export const productRoleLabel = (role: TripMemberRole) => role === "owner" ? "所有者" : role === "collaborator" ? "协作者" : "同行人";
