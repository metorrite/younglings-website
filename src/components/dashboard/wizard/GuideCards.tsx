"use client";

import Link from "next/link";
import { PanelGrid } from "@/components/dashboard/ui/Layout";
import { MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";

const GUIDES = [
  { mode: "quick", title: "Quick setup", time: "About 3 minutes", blurb: "Easy yes or no questions and just the details each part needs. The best place to start.", tag: "Recommended" },
  { mode: "full", title: "Full setup", time: "About 10 minutes", blurb: "Every part with all its options, including your own permission groups.", tag: undefined },
  { mode: "custom", title: "Custom setup", time: "You choose", blurb: "Pick the parts you want to set up now, then go through just those.", tag: undefined },
];

/**
 * The ways to run the guided setup, side by side. Basic offers the quick setup, which is all a new server needs; Advanced adds the full setup (every option)
 * and the custom one (pick the parts).
 */
export function GuideCards({ guildId }: { guildId: string }) {
  const [mode] = useViewMode();
  const guides = mode === "advanced" ? GUIDES : GUIDES.filter((guide) => guide.mode === "quick");

  return (
    <div className="space-y-4">
      <PanelGrid min="18rem" max="26rem">
        {guides.map((guide) => (
          <Link key={guide.mode} href={`/dashboard/${guildId}/wizard?mode=${guide.mode}`} className="group flex flex-col rounded-xl border border-surface-border bg-surface p-6 transition hover:border-gold">
            <div className="flex items-center justify-between gap-2">
              <p className="text-lg font-semibold text-gold">{guide.title}</p>
              {guide.tag && <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold text-gold">{guide.tag}</span>}
            </div>
            <p className="mt-0.5 text-xs text-muted">{guide.time}</p>
            <p className="mt-3 flex-1 text-sm text-muted">{guide.blurb}</p>
            <span className="mt-5 text-sm font-medium transition group-hover:text-gold">Start →</span>
          </Link>
        ))}
      </PanelGrid>
      <MoreInAdvanced>the full setup (every option of every part) and a custom setup (pick the parts you want).</MoreInAdvanced>
    </div>
  );
}
