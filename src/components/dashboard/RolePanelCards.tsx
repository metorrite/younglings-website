import Link from "next/link";
import { StatusBadge } from "@/components/admin/ui";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import type { RolePanelSummary } from "@/lib/jonnybot-admin";

/** The role panels as cards, as many across as fit; each opens that panel's editor at `${base}/${id}`. */
export function RolePanelCards({ panels, base }: { panels: RolePanelSummary[]; base: string }) {
  return (
    <PanelGrid min="20rem" gap="gap-3">
      {panels.map((panel) => (
        <Link key={panel.id} href={`${base}/${panel.id}`} className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5 transition hover:border-gold/50">
          <div>
            <p className="font-semibold">{panel.name}</p>
            <p className="mt-0.5 text-sm text-muted">{panel.title || "No title"}</p>
          </div>
          <div className="mt-auto flex flex-wrap items-center gap-2">
            <StatusBadge tone="muted">
              {panel.buttonCount} button{panel.buttonCount === 1 ? "" : "s"}
            </StatusBadge>
            <StatusBadge tone="muted">{panel.mode === "UNIQUE" ? "Only one" : "Any number"}</StatusBadge>
            {panel.posted ? <StatusBadge tone="good">Posted in #{panel.channelName ?? "deleted channel"}</StatusBadge> : <StatusBadge tone="warn">Not posted</StatusBadge>}
          </div>
        </Link>
      ))}
    </PanelGrid>
  );
}
