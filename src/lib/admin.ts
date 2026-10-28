import { getServerSession } from "next-auth";
import { forbidden, notFound, redirect } from "next/navigation";
import { AdminUnavailableError } from "@/lib/botUnreachable";
import { ownerAllowed } from "@/lib/ownerGate";
import { authOptions } from "@/lib/auth";
import { AdminContext, ApiResult, createAdminContext, whoAmI } from "@/lib/jonnybot-admin";

export { AdminUnavailableError };

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
export async function requireAdmin(returnTo = "/admin"): Promise<AdminContext> {
  return (await resolveAdmin(returnTo)).admin;
}

/**
 * {@link requireAdmin} that also lets only the bot's owner through (Discord application owner / OWNER_IDS, as the bot itself decides). For the Super admin
 * area: premium servers, beta servers, platform health, site-access switches and the restricted-content list. Anyone else, however high their role in a
 * server, gets a 403. Call it at the top of every Super admin page AND Server Action; the bot re-checks the owner on its own routes too.
 */
export async function requireOwner(returnTo = "/admin"): Promise<AdminContext> {
  const { admin, isOwner } = await resolveAdmin(returnTo);
  if (!ownerAllowed(isOwner)) forbidden();
  return admin;
}

/** The admin and whether they are the bot's owner, for the admin header (it shows the Super admin group to owners only). */
export async function requireAdminWithOwner(returnTo = "/admin"): Promise<{ admin: AdminContext; isOwner: boolean }> {
  const { admin, isOwner } = await resolveAdmin(returnTo);
  return { admin, isOwner: ownerAllowed(isOwner) };
}

async function resolveAdmin(returnTo: string): Promise<{ admin: AdminContext; isOwner: boolean | undefined }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(returnTo)}`);
  }

  const result = await whoAmI(session.user.id);
  // whoami answers "no" with a 200 (allowed: false), so any failure here means the check itself couldn't run.
  if (!result.ok) throw new AdminUnavailableError();
  if (!result.data.allowed || result.data.tier === "NONE") redirect("/admin/no-access");

  const admin = createAdminContext({
    actorId: session.user.id,
    displayName: result.data.displayName ?? session.user.name ?? "Admin",
    avatarUrl: result.data.avatarUrl ?? session.user.image ?? null,
    tier: result.data.tier,
  });
  return { admin, isOwner: result.data.isOwner };
}

/**
 * The admin context if — and only if — the current visitor is logged in and the bot confirms they're an Admin or
 * Developer. Unlike {@link requireAdmin} it never redirects or throws: it exists so ordinary pages can *show*
 * admin controls to admins and nothing to everyone else. Showing is only a convenience — every admin action
 * re-checks with `requireAdmin()` on the server, so hiding or tampering with the buttons grants nothing.
 */
export async function getAdminIfAny(): Promise<AdminContext | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const result = await whoAmI(session.user.id);
  if (!result.ok || !result.data.allowed || result.data.tier === "NONE") return null;

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
