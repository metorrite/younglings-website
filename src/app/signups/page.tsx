import { getServerSession } from "next-auth";
import { PageHeader, Unavailable } from "@/components/site/blocks";
import { CreateSignupForm } from "@/components/site/AdminTools";
import { SignupCard } from "@/components/site/SignupCard";
import { getAdminIfAny } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { adminApi } from "@/lib/jonnybot-admin";
import { memberApi } from "@/lib/member";
import { getSignups } from "@/lib/site";

export const metadata = { title: "Signups — Younglings" };
export const dynamic = "force-dynamic";

export default async function SignupsPage() {
  const session = await getServerSession(authOptions);
  const [sheets, mine, admin] = await Promise.all([getSignups(), session?.user?.id ? memberApi.mySignups(session.user.id) : null, getAdminIfAny()]);
  const [structure, adminList] = admin ? await Promise.all([adminApi.structure(admin), adminApi.adminSignups(admin)]) : [null, null];
  const adminSheets = new Map(adminList?.ok ? adminList.data.signups.map((s) => [s.id, s]) : []);
  const joined = new Set(mine?.ok ? mine.data.joined : []);
  const defaultRsn = mine?.ok ? (mine.data.rsns[0] ?? "") : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Signups" subtitle="Sign up for events and groups right here — it's the same list as the one in Discord." />

      {admin && structure?.ok && <CreateSignupForm channels={structure.data.channels} />}
      {sheets === null ? (
        <Unavailable what="Signups" />
      ) : sheets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-10 text-center text-sm text-muted">No signup sheets are open right now.</div>
      ) : (
        sheets.map((sheet) => <SignupCard key={sheet.id} sheet={sheet} joined={joined.has(sheet.id)} loggedIn={!!session} defaultRsn={defaultRsn} adminSheet={adminSheets.get(sheet.id)} />)
      )}
    </div>
  );
}
