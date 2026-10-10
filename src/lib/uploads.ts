import { headers } from "next/headers";
import { UPLOAD_PATH } from "./uploadLimits";

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
