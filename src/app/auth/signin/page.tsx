import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { SignInPanel } from "@/components/auth/SignInPanel";
import { authErrorCode } from "@/lib/authErrors";
import { authOptions, onSiteDomain } from "@/lib/auth";

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

  // Already signed in: carry on to where they were going, but only to this site's own addresses.
  const ours = (callbackUrl.startsWith("/") && !callbackUrl.startsWith("//")) || onSiteDomain(callbackUrl, process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined);
  if (!rawError && (await getServerSession(authOptions))?.user) redirect(ours ? callbackUrl : "/");

  return <SignInPanel code={rawError ? authErrorCode(rawError) : null} rawError={rawError ? rawError.slice(0, 80) : null} callbackUrl={callbackUrl} />;
}
