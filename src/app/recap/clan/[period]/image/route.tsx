import { recapCard } from "@/lib/recapCard";
import { getRecap } from "@/lib/site";

/** The finished clan recap card as a PNG — what the page's last slide shows and what the Discord bot fetches and posts. */
export async function GET(_request: Request, { params }: { params: Promise<{ period: string }> }) {
  const { period } = await params;
  const recap = await getRecap("clan", decodeURIComponent(period));
  if (!recap) return new Response("Recap not found", { status: 404 });
  return recapCard(recap);
}
