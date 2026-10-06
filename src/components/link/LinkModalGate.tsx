import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getMyLink } from "@/lib/site";
import { LinkModalHost } from "./LinkModalHost";

/** Puts the link dialog on every page for signed-in members; it decides for itself when to appear. */
export async function LinkModalGate() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const link = await getMyLink(session.user.id);
  if (!link) return null;
  return <LinkModalHost userId={session.user.id} state={link.state} pendingRsn={link.pendingRsn} />;
}
