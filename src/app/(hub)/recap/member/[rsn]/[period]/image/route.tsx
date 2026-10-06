import { recapCard } from "@/lib/recapCard";
import { getRecap } from "@/lib/site";

/** A member's finished recap card as a PNG — what the page's last slide shows and what the Discord bot fetches and posts. */
export async function GET(_request: Request, { params }: { params: Promise<{ rsn: string; period: string }> }) {
  const { rsn, period } = await params;
  const recap = await getRecap("member", decodeURIComponent(period), decodeURIComponent(rsn));
  if (!recap) return new Response("Recap not found", { status: 404 });
  return recapCard(recap);
}
