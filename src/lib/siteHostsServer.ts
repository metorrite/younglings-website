import { headers } from "next/headers";
import { FACE_HEADER, siteInfoFor, type SiteInfo } from "@/lib/siteHosts";

/** Which face this request is for, from the host it was addressed to. Server Components and Server Actions only. */
export async function currentSite(): Promise<SiteInfo> {
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000").split(",")[0].trim();
  return siteInfoFor(host, h.get("x-forwarded-proto"), h.get(FACE_HEADER));
}
