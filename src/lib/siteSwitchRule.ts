/**
 * How an environment variable and the owner's live switch combine into whether a gate is open. Pure, so it is tested on its own.
 *
 * The environment variable is the hard default and the kill switch:
 *  - `false`: always closed, whatever the live switch says (the kill switch);
 *  - `true`: always open (how the gates have always been opened, so a deployment that already sets it behaves exactly as before);
 *  - anything else or unset: the live switch decides, and a switch that is off, missing, or could not be read is closed.
 */
export type SwitchSource = "env-closed" | "env-open" | "live";

export function resolveSwitch(env: string | undefined, live: boolean | undefined): { open: boolean; source: SwitchSource } {
  const value = env?.trim().toLowerCase();
  if (value === "false") return { open: false, source: "env-closed" };
  if (value === "true") return { open: true, source: "env-open" };
  return { open: live === true, source: "live" };
}
