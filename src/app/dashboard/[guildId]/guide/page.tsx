import Link from "next/link";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { requireGuild } from "@/lib/dashboard";

const GUIDES = [
  { mode: "quick", title: "Quick setup", time: "About 3 minutes", blurb: "Easy yes or no questions and just the details each part needs. The best place to start.", tag: "Recommended" },
  { mode: "full", title: "Full setup", time: "About 10 minutes", blurb: "Every part with all its options, including your own permission groups." },
  { mode: "custom", title: "Custom setup", time: "You choose", blurb: "Pick the parts you want to set up now, then go through just those." },
];

export default async function GuidePage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  await requireGuild(guildId);

  return (
    <div className="space-y-6">
      <PageHeader title="Guided setup" description="A step-by-step run through the parts of JonnyBot. It starts from what is already set here, so you can leave at any point and pick it up again." />
      <div className="grid gap-4 md:grid-cols-3">
        {GUIDES.map((guide) => (
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
      </div>
    </div>
  );
}
