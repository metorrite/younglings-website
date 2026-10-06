import { getServerSession } from "next-auth";
import { PageHeader, Unavailable } from "@/components/site/blocks";
import { SignupCard } from "@/components/site/SignupCard";
import { authOptions } from "@/lib/auth";
import { memberApi } from "@/lib/member";
import { getSignups } from "@/lib/site";

export const metadata = { title: "Signups — Younglings" };
export const dynamic = "force-dynamic";

export default async function SignupsPage() {
  const session = await getServerSession(authOptions);
  const [sheets, mine] = await Promise.all([getSignups(), session?.user?.id ? memberApi.mySignups(session.user.id) : null]);
  const joined = new Set(mine?.ok ? mine.data.joined : []);
  const defaultRsn = mine?.ok ? (mine.data.rsns[0] ?? "") : "";

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Signups" subtitle="Sign up for events and groups right here — it's the same list as the one in Discord." />

      {sheets === null ? (
        <Unavailable what="Signups" />
      ) : sheets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-10 text-center text-sm text-muted">No signup sheets are open right now.</div>
      ) : (
        sheets.map((sheet) => <SignupCard key={sheet.id} sheet={sheet} joined={joined.has(sheet.id)} loggedIn={!!session} defaultRsn={defaultRsn} />)
      )}
    </div>
  );
}
