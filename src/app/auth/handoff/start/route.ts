import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { mappedHost } from "@/lib/auth";
import { allowedRedirect, authHost, cookieDomains, needsHandoff } from "@/lib/authDomains";
import { handoffStore } from "@/lib/authHandoff";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

/**
 * Step one of signing in on the other apex (docs/DOMAINS-AND-SITE-BUILDER.md A3). Runs only on the auth host, right after the Discord
 * sign-in finished there: it issues a one-time code for the host in `to` and sends the browser to that host's /auth/handoff, which
 * swaps the code for its own session. `to` must be one of our hosts on the other apex; anything else just goes home.
 */
export async function GET(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim().toLowerCase();
  const auth = authHost();
  if (!auth || host !== auth) return new NextResponse("Not found", { status: 404, headers: noStore });
  const home = new URL("/", process.env.NEXTAUTH_URL);

  const to = request.nextUrl.searchParams.get("to") ?? "";
  const domains = cookieDomains();
  if (!allowedRedirect(to, domains, mappedHost) || !needsHandoff(to, host, domains)) return NextResponse.redirect(home, { headers: noStore });

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.discordId) {
    const signIn = new URL("/auth/signin", process.env.NEXTAUTH_URL);
    signIn.searchParams.set("callbackUrl", to);
    return NextResponse.redirect(signIn, { headers: noStore });
  }

  const target = new URL(to);
  const code = handoffStore.issue(
    { sub: token.sub, discordId: token.discordId as string, name: token.name ?? null, email: token.email ?? null, picture: token.picture ?? null },
    target.host,
  );
  const next = new URL("/auth/handoff", target.origin);
  next.searchParams.set("code", code);
  next.searchParams.set("to", `${target.pathname}${target.search}`);
  return NextResponse.redirect(next, { headers: noStore });
}
