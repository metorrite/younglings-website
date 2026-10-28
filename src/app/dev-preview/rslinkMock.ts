import type { Answer, LinkApi, LinkRow } from "@/components/rslink/linkApi";
import type { VerifyDetail } from "@/lib/rslink/verify";

/** Made-up answers for the RS Link screens in the preview harness. Nothing here reaches the bot. */
export interface RsLinkMockOptions {
  signedIn?: boolean;
  codeAnswer?: "ok" | "wrong_code" | "expired" | "rate_limited";
  pairing?: "ok" | "expired";
  links?: LinkRow[];
}

const ok = <T,>(data: T): Promise<Answer<T>> => Promise.resolve({ ok: true, data });
const fail = <T,>(status: number, error: string, message: string, retryAfter?: number): Promise<Answer<T>> => Promise.resolve({ ok: false, status, error, message, retryAfter });

/** A made-up "plugin knew it first" state for a sample link (bot T-170). */
function verifyDetail(state: VerifyDetail["state"], matches: number): VerifyDetail {
  return {
    enabled: true,
    state,
    matches,
    misses: 0,
    needed: 2,
    waiting: state === "waiting" ? 2 : 0,
    refusedPublic: 0,
    nextCheckAt: state === "waiting" ? "2026-10-22T18:30:00Z" : null,
    lastReportAt: "2026-10-22T18:10:00Z",
    lastPublishedAt: matches > 0 ? "2026-10-21T21:05:00Z" : null,
    corroboratedAt: state === "corroborated" ? "2026-10-21T21:05:00Z" : null,
  };
}

export const sampleLinks: LinkRow[] = [
  { linkId: "l1", rsn: "Zezima", status: "active", method: "oauth", verification: "implicit", linkedAt: "2026-10-01T10:00:00Z", lastSeenAt: "2026-10-19T20:00:00Z", endedAt: null, tracked: true, devices: 2, previousNames: ["Zezima2"], verify: { xp_first_seen: verifyDetail("waiting", 1) } },
  { linkId: "l4", rsn: "Main Zezima", status: "active", method: "oauth", verification: "public_data_corroborated", linkedAt: "2026-10-02T10:00:00Z", lastSeenAt: "2026-10-21T20:00:00Z", endedAt: null, tracked: true, devices: 1, previousNames: [], verify: { xp_first_seen: verifyDetail("corroborated", 2) } },
  { linkId: "l2", rsn: "Iron Zezima", status: "disputed", method: "dm", verification: "implicit", linkedAt: "2026-10-18T10:00:00Z", lastSeenAt: "2026-10-19T21:00:00Z", endedAt: null, tracked: true, devices: 1, previousNames: [] },
  { linkId: "l3", rsn: "OldAlt", status: "unlinked", method: "oauth", verification: "implicit", linkedAt: "2026-09-01T10:00:00Z", lastSeenAt: "2026-09-20T10:00:00Z", endedAt: "2026-10-10T10:00:00Z", tracked: false, devices: 0, previousNames: [] },
];

export function makeRsLinkApi(o: RsLinkMockOptions = {}): LinkApi {
  return {
    state: () => ok({ signedIn: o.signedIn ?? true, discordName: "someone", csrf: "preview" }),
    code: () => {
      switch (o.codeAnswer ?? "ok") {
        case "wrong_code":
          return fail(404, "wrong_code", "That code isn't right.");
        case "expired":
          return fail(410, "expired", "That code has expired.");
        case "rate_limited":
          return fail(429, "rate_limited", "Too many tries.", 42);
        default:
          return ok({ accepted: true, expiresIn: 540 });
      }
    },
    pairing: () => (o.pairing === "expired" ? fail(410, "expired", "That code has expired.") : ok({ rsn: "Zezima", expiresIn: 480, tracked: true })),
    confirm: (decision) => ok({ result: decision === "link" ? "linked" : "denied" }),
    links: () => ok({ links: o.links ?? sampleLinks }),
    unlink: () => ok({ links: (o.links ?? sampleLinks).slice(1) }),
    deleteMyData: () => ok({ deleted: true }),
    signOut: () => ok({ signedOut: true }),
    signInHref: () => "#",
  };
}
