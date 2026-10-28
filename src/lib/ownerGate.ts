/**
 * The one rule behind the owner-only Super admin area: only an explicit `true` from the bot counts. A missing answer (an older bot), `false`
 * or anything else is a no, so the area fails closed.
 */
export function ownerAllowed(isOwner: unknown): boolean {
  return isOwner === true;
}
