import { notFound } from "next/navigation";
import { RecapPage } from "@/components/recap/RecapPage";
import { Unavailable } from "@/components/site/blocks";
import { RECAP_PERIODS, getRecap, getRoster } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ period: string }> }) {
  const { period } = await params;
  const label = RECAP_PERIODS.find((p) => p.token === period)?.label ?? period;
  return { title: `Clan recap — ${label} — Younglings` };
}

export default async function ClanRecapPage({ params }: { params: Promise<{ period: string }> }) {
  const { period } = await params;
  const recap = await getRecap("clan", decodeURIComponent(period));

  if (recap === null) {
    // Either the bot is unreachable or this isn't a period that exists — tell the two apart with a cheap second call.
    if ((await getRoster()) === null) {
      return (
        <div className="mx-auto max-w-3xl px-4 py-16">
          <Unavailable what="This recap" />
        </div>
      );
    }
    notFound();
  }
  return <RecapPage recap={recap} />;
}
