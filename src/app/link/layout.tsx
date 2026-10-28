import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { LinkShell } from "@/components/rslink/LinkShell";
import { contactEmail, linkEnabled, linkPagePath, sourceUrl } from "@/lib/rslink/config";
import { currentSite } from "@/lib/siteHostsServer";

export const dynamic = "force-dynamic";

/** The RS Link face (LINK-SYSTEM.md section 14). Off unless LINK_ENABLED=true; on its own host (LINK_HOST) the paths have no /link prefix. */
export default async function LinkLayout({ children }: { children: ReactNode }) {
  if (!linkEnabled()) notFound();
  const site = await currentSite();
  return (
    <LinkShell base={linkPagePath(site.linkHost, "/")} source={sourceUrl()} contact={contactEmail()}>
      {children}
    </LinkShell>
  );
}
