import { BingoPoolManager } from "@/components/dashboard/BingoPoolManager";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { dashboardData, requireGuild } from "@/lib/dashboard";
import { adminApi } from "@/lib/jonnybot-admin";
import { addBingoTileAction, clearBingoPoolAction, deleteBingoTileAction, saveBingoTileAction, seedBingoPoolAction } from "./actions";

export const metadata = { title: "Bingo tile pool — Dashboard — JonnyBot" };
export const dynamic = "force-dynamic";

export default async function BingoPoolPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const guild = await requireGuild(guildId);
  const pool = await adminApi.bingoPool(guild).then(dashboardData);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bingo tile pool"
        description="Your own list of bingo tiles, with a difficulty and tags. Add your own, or start from a pack made from the RuneScape Wiki. When you make a bingo event, choose Your tile pool for where its tiles come from."
      />
      <BingoPoolManager
        initial={pool}
        actions={{
          add: addBingoTileAction.bind(null, guildId),
          save: saveBingoTileAction.bind(null, guildId),
          remove: deleteBingoTileAction.bind(null, guildId),
          seed: seedBingoPoolAction.bind(null, guildId),
          clear: clearBingoPoolAction.bind(null, guildId),
        }}
      />
    </div>
  );
}
