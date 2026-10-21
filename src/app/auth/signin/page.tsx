import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignInPanel } from "@/components/auth/SignInPanel";
import { authErrorCode } from "@/lib/authErrors";
import { authOptions, mappedHost, onSiteDomain } from "@/lib/auth";
import { allowedRedirect, authHost, cookieDomainFor, cookieDomains, multiDomain, needsHandoff } from "@/lib/authDomains";
import { schemeFor } from "@/lib/siteHosts";

export const metadata = { title: "Sign in — Younglings", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * The site's own sign-in page, which next-auth sends people to (see `pages` in lib/auth): both when a page needs a login and when
 * signing in goes wrong. It sits inside the normal site layout so the navigation still works, instead of next-auth's bare default.
 */
export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const rawError = first(params.error);
  const callbackUrl = first(params.callbackUrl) || "/";

  // Two cookie domains (AUTH_COOKIE_DOMAINS): the Discord sign-in only completes on the auth host, so someone on the other apex signs in
  // there and is handed back afterwards (lib/authHandoff). Their own page address goes along as an absolute callback.
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").split(",")[0].trim().toLowerCase();
  const domains = cookieDomains();
  const auth = authHost();
  if (multiDomain(domains) && auth && host !== auth && cookieDomainFor(host, domains) !== cookieDomainFor(auth, domains)) {
    const back = callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") ? `${schemeFor(host, h.get("x-forwarded-proto"))}://${host}${callbackUrl}` : callbackUrl;
    const there = new URL("/auth/signin", process.env.NEXTAUTH_URL);
    there.searchParams.set("callbackUrl", allowedRedirect(back, domains, mappedHost) ? back : "/");
    if (rawError) there.searchParams.set("error", rawError.slice(0, 80));
    redirect(there.toString());
  }

  // Already signed in: carry on to where they were going, but only to this site's own addresses (through the handoff for the other apex).
  const ours = (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) || onSiteDomain(callbackUrl, process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined) || allowedRedirect(callbackUrl, domains, mappedHost);
  if (!rawError && (await getServerSession(authOptions))?.user) {
    if (ours && needsHandoff(callbackUrl, host, domains)) redirect(`/auth/handoff/start?to=${encodeURIComponent(callbackUrl)}`);
    redirect(ours ? callbackUrl : "/");
  }

  return <SignInPanel code={rawError ? authErrorCode(rawError) : null} rawError={rawError ? rawError.slice(0, 80) : null} callbackUrl={callbackUrl} />;
}
