import { OG_SIZE, ogCard } from "@/lib/og";
import { getPolls } from "@/lib/site";

export const alt = "Younglings polls";
export const size = OG_SIZE;
export const contentType = "image/png";
export const dynamic = "force-dynamic";

/** The preview card for a pasted link to the polls page: the newest open poll and how many are running. */
export default async function Image() {
  const polls = await getPolls();
  const open = polls?.filter((p) => p.active) ?? [];
  return ogCard(
    "Polls",
    open[0] ? open[0].title : "Vote on what the clan decides",
    polls ? [{ label: "Open polls", value: String(open.length) }, { label: "Votes cast", value: String(open.reduce((n, p) => n + p.totalVotes, 0)) }] : [],
  );
}
