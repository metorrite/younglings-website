import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getMyRsns } from "@/lib/site";

export const dynamic = "force-dynamic";

/** "My recap": sends a signed-in member to their own monthly recap (or to the recap picker if no name is linked yet). */
export default async function MyRecap() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin?callbackUrl=%2Frecap%2Fme");

  const rsns = await getMyRsns(session.user.id);
  redirect(rsns && rsns.length > 0 ? `/recap/member/${encodeURIComponent(rsns[0])}/month` : "/recap");
}
