import { MAX_UPLOAD_BYTES, type UploadResult } from "@/lib/uploadLimits";
import { requestOrigin, uploadedImageUrl } from "@/lib/uploads";
import { throttle } from "@/lib/ratelimit";
import type { ApiResult } from "@/lib/jonnybot-admin";

/**
 * The shared body of the picture-upload routes. Uploads go through ordinary routes rather than Server Actions: a route answers with a
 * plain HTTP status the page can show, isn't queued behind other actions, and has no body-size setting of its own to get wrong.
 * Each caller authenticates first (that is what makes {@link receiveImage} safe to call) and hands over who is asking.
 */

export const IMAGE_SLOTS = ["author_icon", "thumbnail", "image", "footer_icon"];

function json(status: number, body: UploadResult): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

const fail = (status: number, error: string) => json(status, { ok: false, error, problems: [] });

/** What a thrown sign-in redirect or 404 from the auth helpers means for a route, which can't redirect: a status the page can show. */
export function authFailure(error: unknown): Response | null {
  const digest = typeof error === "object" && error !== null && "digest" in error ? String((error as { digest: unknown }).digest) : "";
  if (digest.startsWith("NEXT_REDIRECT")) return fail(401, "You're signed out. Reload the page and sign in again.");
  if (digest.includes("404")) return fail(404, "That server or page isn't available to you.");
  return null;
}

/** Reads the posted picture and stores it for {@code slot}. Call only after the person has been verified. */
export async function receiveImage(
  request: Request,
  slot: string,
  actorId: string,
  send: (base64: string) => Promise<ApiResult<{ token: string; version: number }>>,
): Promise<Response> {
  if (!IMAGE_SLOTS.includes(slot)) return fail(404, "That isn't a place a picture can go.");

  // Cookies alone authenticate this route, so refuse a request from another site (a browser always names its origin on a POST).
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host.split(",")[0].trim()) return fail(403, "That request came from another site.");

  const slow = throttle(actorId, "admin");
  if (slow) return fail(429, slow);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "That upload couldn't be read.");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return fail(400, "Choose a picture to upload.");
  if (file.size > MAX_UPLOAD_BYTES) return fail(413, `That picture is too big. Keep it under ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`);

  const result = await send(Buffer.from(await file.arrayBuffer()).toString("base64"));
  if (!result.ok) return fail(result.status === 0 ? 502 : result.status >= 400 && result.status < 500 ? result.status : 502, result.error);
  return json(200, { ok: true, data: { url: uploadedImageUrl(await requestOrigin(), result.data.token, result.data.version) } });
}
