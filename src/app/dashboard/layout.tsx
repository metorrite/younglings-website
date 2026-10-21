import type { ReactNode } from "react";
import { UnderDevelopment } from "@/components/jonnybot/UnderDevelopment";
import { requireDashboardUser } from "@/lib/dashboard";
import { canEnter } from "@/lib/restrictedAccess";
import { switchOpen } from "@/lib/siteSwitches";
import { currentSite } from "@/lib/siteHostsServer";

export const metadata = { title: "JonnyBot dashboard — beta" };

/**
 * The shell for the bot dashboard. Everything under /dashboard is built to stand apart from the clan's own site (its own
 * layout, no links into /admin) so that it can later be served from its own address by routing alone. The check here is
 * only the first line of defence: every page and Server Action runs its own, because layouts aren't re-run on client-side
 * navigation. It adds no width limit of its own: the server pages use the whole screen, and the server picker sets its own.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const open = await switchOpen("dashboard");
  // While the dashboard is closed, everyone but the clan's admins gets the same "under development" page the rest of JonnyBot's site shows.
  if (!open && !(await canEnter("dashboard"))) return <UnderDevelopment site={await currentSite()} />;
  await requireDashboardUser();

  return <div className="w-full">{children}</div>;
}
