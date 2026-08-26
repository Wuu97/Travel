/** Cloud discovery and a successful remote read are the only client-side proof
 * that a trip is cloud-backed. An access token alone is not sufficient. */
export function isCloudBackedTrip(tripId: string, accessToken: string | null, cloudTripIds: ReadonlySet<string>) {
  return Boolean(accessToken) && cloudTripIds.has(tripId);
}
