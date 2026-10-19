import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { decideOwner } from "@/lib/devSnapshotGate";
import { createAdminContext, whoAmI, type AdminContext } from "@/lib/jonnybot-admin";

/**
 * The server-side owner check behind the dev snapshot button. It reads the verified login session (never anything the request says about itself) and asks
 * the bot whether that person owns the bot. Both the layout (to decide whether the button exists in the HTML at all) and the snapshot route (to refuse
 * anyone else) call it, so hiding the button is a convenience and the route is the real lock.
 */
export async function currentOwner(): Promise<{ context: AdminContext; tier: string } | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  if (!id) return null;

  const decision = await decideOwner(id, (userId) => whoAmI(userId));
  if (!decision.owner || !decision.tier) return null;
  const tier = decision.tier === "DEVELOPER" ? "DEVELOPER" : "ADMIN";
  return {
    tier,
    context: createAdminContext({ actorId: id, displayName: session.user.name ?? "Owner", avatarUrl: session.user.image ?? null, tier }),
  };
}
