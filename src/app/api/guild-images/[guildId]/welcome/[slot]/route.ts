import { requireGuild } from "@/lib/dashboard";
import { dashboardApi } from "@/lib/jonnybot-admin";
import { authFailure, receiveImage } from "@/lib/uploadRoute";

/** A picture for one place in a server's welcome embed, from the bot dashboard. The person is verified for *this* server first, like every dashboard action. */
export async function POST(request: Request, { params }: { params: Promise<{ guildId: string; slot: string }> }) {
  const { guildId, slot } = await params;
  let guild;
  try {
    guild = await requireGuild(guildId);
  } catch (error) {
    const response = authFailure(error);
    if (response) return response;
    throw error;
  }
  return receiveImage(request, slot, guild.actorId, (base64) => dashboardApi.uploadWelcomeImage(guild, slot, base64));
}
