import Link from "next/link";
import type { ReactNode } from "react";
import { UnderDevelopment } from "@/components/jonnybot/UnderDevelopment";
import { requireDashboardUser } from "@/lib/dashboard";
import { canSeeJonnyBot } from "@/lib/jonnybotAccess";
import { currentSite } from "@/lib/siteHostsServer";

export const metadata = { title: "JonnyBot dashboard — beta" };

/**
 * The shell for the bot dashboard. Everything under /dashboard is built to stand apart from the clan's own site (its own
 * layout, no links into /admin) so that it can later be served from its own address by routing alone. The check here is
 * only the first line of defence: every page and Server Action runs its own, because layouts aren't re-run on client-side
 * navigation.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const open = process.env.DASHBOARD_PUBLIC === "true";
  // While the dashboard is closed, everyone but the clan's admins gets the same "under development" page the rest of JonnyBot's site shows.
  if (!open && !(await canSeeJonnyBot())) return <UnderDevelopment site={await currentSite()} />;
  const user = await requireDashboardUser();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-surface-border pb-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-lg font-semibold">
            JonnyBot dashboard
          </Link>
          <span className="rounded-full bg-gold/15 px-2.5 py-0.5 text-xs font-semibold text-gold">{open ? "Beta" : "Beta · clan admins only"}</span>
        </div>
        <p className="text-sm text-muted">Signed in as {user.displayName}</p>
      </header>
      {children}
    </div>
  );
}
