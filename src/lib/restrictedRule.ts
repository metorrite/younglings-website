/**
 * Whether the bot's whoami answer lets someone into a restricted area. The bot works out `areas` (the beta rule or a grant on the owner's access
 * list, per area). An older bot without `areas` falls back to the single `beta` flag, then to the clan's own admins. When `areas` is there but
 * does not name the area, the answer is no: the gate fails closed.
 */
export type RestrictedArea = "jonnybot" | "hub" | "dashboard";

export interface AccessAnswer {
  allowed: boolean;
  tier: string;
  beta?: boolean;
  areas?: Partial<Record<string, boolean>>;
}

export function areaAllowed(who: AccessAnswer, area: RestrictedArea): boolean {
  if (who.areas) return who.areas[area] === true;
  return who.beta ?? (who.allowed && who.tier !== "NONE");
}
