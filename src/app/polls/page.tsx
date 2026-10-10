import { getServerSession } from "next-auth";
import { PageHeader, Unavailable } from "@/components/site/blocks";
import { CreatePollForm } from "@/components/site/AdminTools";
import { MemberPollForm } from "@/components/site/MemberPollForm";
import { PollCard } from "@/components/site/PollCard";
import { getAdminIfAny } from "@/lib/admin";
import { authOptions } from "@/lib/auth";
import { adminApi, choicesOf } from "@/lib/jonnybot-admin";
import { memberApi } from "@/lib/member";
import { getPolls } from "@/lib/site";

export const metadata = { title: "Polls — Younglings" };
export const dynamic = "force-dynamic";

export default async function PollsPage() {
  const session = await getServerSession(authOptions);
  const [polls, mine, admin] = await Promise.all([getPolls(), session?.user?.id ? memberApi.myPolls(session.user.id) : null, getAdminIfAny()]);
  const structure = admin ? await adminApi.structure(admin) : null;
  const picks = new Map(mine?.ok ? mine.data.polls.map((p) => [p.pollId, p.mine]) : []);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Polls" subtitle="Vote right here — your vote shows up on the Discord poll too, and the other way round. Verified clan members can vote." />
      {admin && structure?.ok ? <CreatePollForm {...choicesOf(structure.data)} /> : session ? <MemberPollForm /> : null}
      {polls === null ? (
        <Unavailable what="Polls" />
      ) : polls.length === 0 ? (
        <div className="rounded-xl border border-dashed border-surface-border p-10 text-center text-sm text-muted">No polls yet.</div>
      ) : (
        polls.map((poll) => <PollCard key={poll.id} poll={poll} initialMine={picks.get(poll.id) ?? []} loggedIn={!!session} admin={!!admin} />)
      )}
    </div>
  );
}
