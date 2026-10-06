import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

const TOOLS = [
  {
    href: "/admin/tickets",
    title: "Ticket panels",
    body: "Create and edit ticket panels — the form, who's pinged, who can help — and post them to a channel.",
  },
  { href: "/admin/tickets/history", title: "Tickets", body: "Browse open and closed tickets and read their saved transcripts." },
  { href: "/admin/tickets/settings", title: "Ticket settings", body: "Transcript log channel, retention, and the close delay." },
  { href: "/admin/roles", title: "Self-assignable roles", body: "Choose which roles members can add to or remove from themselves on their profile page." },
  { href: "/admin/clan", title: "Clan points & ranks", body: "Points awarded for membership and Citadel activity, and the points each rank needs." },
];

export default async function AdminHomePage() {
  const admin = await requireAdmin("/admin");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {admin.displayName}</h1>
        <p className="mt-1 text-sm text-muted">Server admin tools. Everything here is checked against your roles in the Discord server each time.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href} className="rounded-lg border border-surface-border bg-surface p-5 transition hover:border-gold/50">
            <h2 className="font-semibold text-gold">{tool.title}</h2>
            <p className="mt-1 text-sm text-muted">{tool.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
