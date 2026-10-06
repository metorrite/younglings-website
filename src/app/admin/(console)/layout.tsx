import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/admin";

export const metadata = { title: "Admin — Younglings" };

/**
 * The shell for every gated admin page. The check here is for the header (and as a first line of defence);
 * it is NOT what protects the pages — layouts aren't re-run on client-side navigation, so every page and
 * Server Action also calls `requireAdmin()` itself.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <AdminNav name={admin.displayName} avatarUrl={admin.avatarUrl} tier={admin.tier} />
      {children}
    </div>
  );
}
