import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminContext, ApiResult, createAdminContext, whoAmI } from "@/lib/jonnybot-admin";

/**
 * The one gate in front of everything under /admin. Call it at the top of every admin page AND every admin
 * Server Action — a layout alone isn't enough, because layouts don't re-render on client-side navigation and
 * Server Actions can be invoked by a direct POST that never touches a page.
 *
 * It (1) reads the user from the verified login session — never from request input, (2) asks JonnyBot
 * whether that Discord user is Admin tier or holds the Developer role *right now* (so a demoted admin loses
 * access on their next click rather than when their login expires), and (3) only then hands back the
 * {@link AdminContext} every admin API call requires.
 *
 *  - not logged in        → sign-in, returning here afterwards
 *  - logged in, no access → /admin/no-access
 *  - the check can't run (JonnyBot down, wrong secret) → throws, which the /admin error boundary shows as "can't reach JonnyBot"
 *    (access fails closed; it is never granted because the check couldn't run)
 */
export class AdminUnavailableError extends Error {
  constructor() {
    super("JonnyBot is unreachable, so admin access can't be verified.");
  }
}

export async function requireAdmin(returnTo = "/admin"): Promise<AdminContext> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(returnTo)}`);
  }

  const result = await whoAmI(session.user.id);
  // whoami answers "no" with a 200 (allowed: false), so any failure here means the check itself couldn't run.
  if (!result.ok) throw new AdminUnavailableError();
  if (!result.data.allowed || result.data.tier === "NONE") redirect("/admin/no-access");

  return createAdminContext({
    actorId: session.user.id,
    displayName: result.data.displayName ?? session.user.name ?? "Admin",
    avatarUrl: result.data.avatarUrl ?? session.user.image ?? null,
    tier: result.data.tier,
  });
}

/** For page data: the value, a 404 page for "doesn't exist", or an error the /admin error boundary shows. */
export function unwrap<T>(result: ApiResult<T>): T {
  if (result.ok) return result.data;
  if (result.status === 404) notFound();
  if (result.status === 0) throw new AdminUnavailableError();
  throw new Error(result.error);
}
