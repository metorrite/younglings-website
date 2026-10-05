import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "Admin — Younglings" };

const SECTIONS = [
  { href: "/admin/tickets", label: "Ticket panels" },
  { href: "/admin/tickets/history", label: "Tickets" },
  { href: "/admin/tickets/settings", label: "Settings" },
];

/**
 * The shell for every gated admin page. The check here is for the header (and as a first line of defence);
 * it is NOT what protects the pages — layouts aren't re-run on client-side navigation, so every page and
 * Server Action also calls `requireAdmin()` itself.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-surface-border pb-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-lg font-semibold text-gold">
            Admin
          </Link>
          <nav className="flex gap-4 text-sm text-muted">
            {SECTIONS.map((section) => (
              <Link key={section.href} href={section.href} className="transition hover:text-foreground">
                {section.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          {admin.avatarUrl && <Image src={admin.avatarUrl} alt="" width={24} height={24} className="rounded-full" />}
          {admin.displayName}
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">{admin.tier === "ADMIN" ? "Admin" : "Developer"}</span>
        </div>
      </div>
      {children}
    </div>
  );
}
