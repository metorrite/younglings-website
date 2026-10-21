import { botCall } from "@/lib/botCall";
import { apiError, clientIp, limited, unavailable } from "@/lib/publicApi";
import { throttle } from "@/lib/ratelimit";

/**
 * The plugin talks to the website (the bot's own port is not public); the website checks the shape, applies its own limits and forwards
 * to the bot with the token. The bot does the real work: it recognises the token, checks the player owns the name and has allowed the
 * category, and validates every event.
 */
export const MAX_BODY_BYTES = 256 * 1024;

const TOKEN = /^jbp_[A-Za-z0-9_-]{43}$/;

/** A compact JWS (three base64url parts) from `Authorization: RSLink <assertion>`: RuneSync signs its uploads through the RS Link plugin. */
const ASSERTION = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/** The RS Link assertion from `Authorization: RSLink <assertion>`, or null. The bot checks its signature and who it belongs to. */
export function rsLinkAssertion(request: Request): string | null {
  const match = /^RSLink\s+(\S+)$/.exec((request.headers.get("authorization") ?? "").trim());
  return match && match[1].length <= 4096 && ASSERTION.test(match[1]) ? match[1] : null;
}

/** The token from `Authorization: Bearer jbp_...`, or null. */
export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match && TOKEN.test(match[1]) ? match[1] : null;
}

/** Forwards a plugin call to the bot and returns its answer as-is (status and JSON), or a tidy error. */
export async function forwardToBot(request: Request, path: string, method: "GET" | "POST"): Promise<Response> {
  const early = limited(request, "ingest");
  if (early) return early;
  // Either a manual plugin token, or (RuneSync) an RS Link assertion the bot verifies.
  const token = bearerToken(request);
  const assertion = token ? null : rsLinkAssertion(request);
  if (!token && !assertion) return apiError(401, "Send your plugin token as Authorization: Bearer jbp_..., or an RS Link assertion as Authorization: RSLink ...", { "WWW-Authenticate": "Bearer" });
  // A second bucket per token or assertion, so one noisy plugin can't use up everyone behind a shared address.
  if (throttle((token ?? assertion ?? "").slice(-16), "ingest") || throttle(clientIp(request), "ingest")) return apiError(429, "Too many requests. Send fewer, larger batches.", { "Retry-After": "2" });

  let body: string | undefined;
  if (method === "POST") {
    const length = Number(request.headers.get("content-length") ?? "0");
    if (length > MAX_BODY_BYTES) return apiError(413, `The batch is larger than ${MAX_BODY_BYTES / 1024} KB.`);
    body = await request.text();
    if (body.length > MAX_BODY_BYTES) return apiError(413, `The batch is larger than ${MAX_BODY_BYTES / 1024} KB.`);
    if (!body.trim()) return apiError(400, "The request body is empty.");
  }

  const answer = await botCall(path, { method, headers: token ? { "X-Plugin-Token": token } : { Authorization: `RSLink ${assertion}` }, body });
  if (!answer) return unavailable();
  return new Response(JSON.stringify(answer.json), {
    status: answer.status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-API-Version": "1" },
  });
}
