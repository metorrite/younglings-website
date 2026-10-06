import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getMyRsns } from "@/lib/site";

export const dynamic = "force-dynamic";

/** "My public profile": sends a signed-in member to their own clan profile (or to their settings if no name is linked yet). */
export default async function MyPublicProfile() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/api/auth/signin?callbackUrl=%2Fprofile%2Fpublic");

  const rsns = await getMyRsns(session.user.id);
  redirect(rsns && rsns.length > 0 ? `/members/${encodeURIComponent(rsns[0])}` : "/profile");
}
