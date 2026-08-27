import { useState } from "react";
import { createNeutralTripBootstrap, type NeutralTripBootstrap } from "../bootstrapState";

export { createNeutralTripBootstrap, type NeutralTripBootstrap } from "../bootstrapState";

/** Browser snapshots are restored by the controller effect after mounting. */
export function useTripBootstrap(): NeutralTripBootstrap {
  const [bootstrap] = useState(createNeutralTripBootstrap);
  return bootstrap;
}
