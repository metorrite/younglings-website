import { botCall } from "@/lib/botCall";
import { resolveSwitch, type SwitchSource } from "@/lib/siteSwitchRule";

/**
 * The live site-access switches: whether the JonnyBot website, the clans hub and the bot dashboard are open to everyone. The owner flips them in
 * Super admin; the bot stores them. Each gate asks here. See {@link resolveSwitch} for how the environment variables (the kill switch) combine
 * with them. The bot's answer is remembered for a few seconds, so a change takes effect within the minute, and a bot that cannot be reached
 * leaves the gate closed (never guessed open).
 */
export type SwitchKey = "jonnybot" | "hub" | "dashboard";

export const SWITCH_ENV: Record<SwitchKey, string> = {
  jonnybot: "JONNYBOT_PUBLIC",
  hub: "HUB_PUBLIC",
  dashboard: "DASHBOARD_PUBLIC",
};

const REMEMBER_MS = 15_000;
let remembered: { at: number; states: Partial<Record<SwitchKey, boolean>> } | null = null;

async function liveStates(): Promise<Partial<Record<SwitchKey, boolean>>> {
  if (remembered && Date.now() - remembered.at < REMEMBER_MS) return remembered.states;
  const answer = await botCall<{ switches?: Partial<Record<SwitchKey, boolean>> }>("/internal/directory/site-switches");
  const states = answer?.status === 200 ? (answer.json.switches ?? {}) : {};
  // Only a real answer is remembered for long; a failure is retried on the next request, and meanwhile counts as closed.
  remembered = { at: answer?.status === 200 ? Date.now() : Date.now() - REMEMBER_MS + 2_000, states };
  return states;
}

/** Forgets the remembered answer, so a change made in Super admin shows on this server straight away. */
export function forgetSwitches(): void {
  remembered = null;
}

/** Whether this gate is open to everyone right now, and what decided it. */
export async function switchState(key: SwitchKey): Promise<{ open: boolean; source: SwitchSource }> {
  const env = process.env[SWITCH_ENV[key]];
  // The environment alone settles it unless it leaves the choice to the live switch, so the bot is only asked when needed.
  const fixed = resolveSwitch(env, undefined);
  if (fixed.source !== "live") return fixed;
  return resolveSwitch(env, (await liveStates())[key]);
}

export async function switchOpen(key: SwitchKey): Promise<boolean> {
  return (await switchState(key)).open;
}
