import { encode } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { cookieDomainForRequest } from "@/lib/auth";
import { multiDomain, safePath } from "@/lib/authDomains";
import { handoffStore } from "@/lib/authHandoff";
import { schemeFor } from "@/lib/siteHosts";

export const dynamic = "force-dynamic";

const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // next-auth's own default session length
const noStore = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };

/**
 * Step two of signing in on the other apex (docs/DOMAINS-AND-SITE-BUILDER.md A3): swaps the one-time code the auth host issued for a
 * session cookie on this apex, then goes to `to` (a path on this host). A used, expired or wrong-host code just leads back to sign-in.
 * Only exists while there are two cookie domains.
 */
export async function GET(request: NextRequest) {
  if (!multiDomain()) return new NextResponse("Not found", { status: 404, headers: noStore });
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim().toLowerCase();
  const to = safePath(request.nextUrl.searchParams.get("to"));
  const origin = `${schemeFor(host, request.headers.get("x-forwarded-proto"))}://${host}`;
  const identity = handoffStore.redeem(request.nextUrl.searchParams.get("code") ?? "", host);
  const secret = process.env.NEXTAUTH_SECRET;
  if (!identity || !secret) {
    const signIn = new URL("/auth/signin", origin);
    signIn.searchParams.set("callbackUrl", `${origin}${to}`);
    // With an error the sign-in page shows it instead of sending the visitor round again (no loop if handoffs keep failing).
    signIn.searchParams.set("error", "Handoff");
    return NextResponse.redirect(signIn, { headers: noStore });
  }

  const secure = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");
  const session = await encode({ token: { ...identity }, secret, maxAge: SESSION_MAX_AGE });
  const response = NextResponse.redirect(new URL(to, origin), { headers: noStore });
  response.cookies.set(`${secure ? "__Secure-" : ""}next-auth.session-token`, session, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure,
    maxAge: SESSION_MAX_AGE,
    domain: cookieDomainForRequest(host),
  });
  return response;
}
