const USER_ID_HEADER = "oai-authenticated-user-id";

/** Platform identity is the authority for shared-trip reads and mutations. */
export function getAuthenticatedUserId(request: Request) {
  const userId = request.headers.get(USER_ID_HEADER)?.trim();
  if (!userId) return null;
  return userId.slice(0, 200);
}
