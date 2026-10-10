import { headers } from "next/headers";
import { MAX_UPLOAD_BYTES, UPLOAD_PATH } from "./uploadLimits";

/** Where this request reached the site, so an address built from it works for whoever has to fetch it (Discord, for an embed) on this deployment. */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;
}

/** The public address of an uploaded picture. The version only changes the address when the picture changes, so Discord fetches the new one. */
export function uploadedImageUrl(origin: string, token: string, version: number): string {
  return `${origin}${UPLOAD_PATH}/${token}?v=${version}`;
}

/** The file from a form, base64-encoded for the bot, or a message saying why it can't be used. */
export async function readUploadedFile(form: FormData): Promise<{ ok: true; base64: string } | { ok: false; error: string }> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a picture to upload." };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: `That picture is too big. Keep it under ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.` };
  return { ok: true, base64: Buffer.from(await file.arrayBuffer()).toString("base64") };
}
