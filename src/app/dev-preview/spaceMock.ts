import type { EventDetail } from "@/lib/eventTypes";
import { initialTeamsDetail } from "./teamsMock";
import { spaceViews } from "./spaceViews";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** A mock of the bot's roles-and-channels routes over one scenario: preview and save answer with the scenario's view, and apply and remove run a pretend background job. */
export function makeSpaceCall(scenario: string) {
  let enabled = scenario !== "off";
  // "drift": set up earlier, then a role and a channel were changed on Discord, so they are listed to be put back
  const drift = scenario === "drift";
  let applied = drift;
  let job: Json | null = null;
  const base = drift ? "solo" : scenario;
  const clone = (): Json => JSON.parse(JSON.stringify(spaceViews[enabled && base === "off" ? "solo" : enabled ? base : "off"]));
  const view = (): Json => {
    const v = clone();
    v.settings.enabled = enabled;
    v.job = job;
    v.state.applied = applied;
    v.state.complete = applied;
    v.state.appliedAt = applied ? new Date().toISOString() : null;
    v.state.appliedBy = applied ? "Drake" : null;
    if (applied) {
      v.complete = true;
      for (const r of v.roles) r.action = "keep";
      for (const c of v.channels) if (c.action === "create") c.action = "keep";
      v.summary.newRoles = 0;
      v.summary.newChannels = 0;
    }
    if (applied && drift && !job) {
      v.roles[0].action = "repair";
      v.roles[0].note = `Called @Bingo peeps on Discord now; it gets its name back.`;
      const general = v.channels.find((c: Json) => c.kind === "general") ?? v.channels[1];
      general.action = "repair";
      general.note = "Put back: it was renamed (it is #chit-chat now), who can see or write in it was changed.";
      v.summary.toRepair = 2;
      v.complete = false;
      v.state.complete = false;
      v.state.note = "putting the role " + v.roles[0].name + " back, putting #" + general.name + " back";
    }
    return v;
  };
  return async (method: string, path: string, body?: unknown) => {
    await new Promise((r) => setTimeout(r, 150));
    if (path.endsWith("/space") && method === "GET") {
      if (job && job.state === "running") {
        job.done = Math.min(job.total, job.done + 2);
        job.message = job.done >= job.total ? "Done." : "Making the channel #boss-night-friday-general…";
        if (job.done >= job.total) {
          job.state = "done";
          job.finishedAt = new Date().toISOString();
          job.message = job.kind === "removal" ? "Everything JonnyBot made for this event has been removed." : "The roles and channels are set up.";
          applied = job.kind !== "removal";
        }
      }
      return { ok: true as const, data: view() };
    }
    if (path.endsWith("/apply") || path.endsWith("/remove")) {
      job = { kind: path.endsWith("/apply") ? "setup" : "removal", state: "running", done: 0, total: 7, message: "Making the role Boss Night Friday Participant…", startedAt: new Date().toISOString(), finishedAt: null };
      return { ok: true as const, data: view() };
    }
    if (path.endsWith("/sync")) return { ok: true as const, data: { ...view(), syncFailed: 0 } };
    if (path.endsWith("/preview") || path.endsWith("/settings")) {
      const draft = (body ?? {}) as Json;
      const names = (draft.names ?? {}) as Record<string, string>;
      if (Object.values(names).some((v) => String(v).includes("{nope}"))) return { ok: false as const, error: "Those choices can't be used yet.", problems: ["The general chat name can't use {nope}; use {event}."] };
      enabled = draft.enabled === true;
      return { ok: true as const, data: view() };
    }
    if (method === "GET" && /^events\/\d+$/.test(path)) return { ok: true as const, data: initialTeamsDetail() };
    return { ok: false as const, error: "Not in the mock.", problems: [] };
  };
}

export const spaceDetail: EventDetail = initialTeamsDetail();
