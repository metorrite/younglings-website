import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { EventView } from "@/components/clan-events/EventView";
import { PageHeader, Unavailable } from "@/components/site/blocks";
import { authOptions } from "@/lib/auth";
import { memberApi } from "@/lib/member";

export const metadata = { title: "Clan event — Younglings" };
export const dynamic = "force-dynamic";

export default async function ClanEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,18}$/.test(id)) notFound();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(`/clan-events/${id}`)}`);
  const page = await memberApi.eventPage(session.user.id, id);

  if (!page.ok) {
    if (page.status === 404) notFound();
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6">
        <PageHeader title="Clan event" />
        {page.status === 403 ? <p className="rounded-xl border border-gold/40 p-4 text-sm text-gold">{page.error}</p> : <Unavailable what="This event" />}
      </div>
    );
  }
  return <EventView data={page.data} />;
}
