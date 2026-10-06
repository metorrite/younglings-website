import { notFound } from "next/navigation";
import { RecapPage } from "@/components/recap/RecapPage";
import { Unavailable } from "@/components/site/blocks";
import { RECAP_PERIODS, getRecap, getRoster } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ rsn: string; period: string }> }) {
  const { rsn, period } = await params;
  const label = RECAP_PERIODS.find((p) => p.token === period)?.label ?? period;
  return { title: `${decodeURIComponent(rsn)} — ${label} recap — Younglings` };
}

export default async function MemberRecapPage({ params }: { params: Promise<{ rsn: string; period: string }> }) {
  const { rsn, period } = await params;
  const recap = await getRecap("member", decodeURIComponent(period), decodeURIComponent(rsn));

  if (recap === null) {
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
