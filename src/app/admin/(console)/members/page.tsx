import { MembersTable } from "@/components/admin/MembersTable";
import { requireAdmin, unwrap } from "@/lib/admin";
import { adminApi } from "@/lib/jonnybot-admin";

export const metadata = { title: "Roster — Admin — Younglings" };
export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const admin = await requireAdmin("/admin/members");
  const roster = unwrap(await adminApi.roster(admin));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Roster</h1>
        <p className="mt-1 text-sm text-muted">Every clan member in one place: who is verified, how fresh their data is, and where they stand this Citadel week.</p>
      </div>
      <MembersTable roster={roster} />
    </div>
  );
}
