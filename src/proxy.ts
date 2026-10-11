import { NextResponse, type NextRequest } from "next/server";
import { apexHost, classifyHost, clanHostOf, FACE_HEADER, jonnybotHostOf, schemeFor, subdomainMode } from "@/lib/siteHosts";

/**
 * Routes the two faces of the site by hostname (see lib/siteHosts) and tells pages which face a request is for, in a request
 * header, so the header and footer match.
 *
 * Without JONNYBOT_SUBDOMAIN=true nothing is moved: JonnyBot's pages stay under /jonnybot and the dashboard at /dashboard on the
 * one host, and those two get JonnyBot's header. With it, on the JonnyBot host the visible addresses are short (`/`, `/docs`,
 * `/install`) and are served from the /jonnybot pages; `/dashboard`, `/api` and files pass straight through; anything that is the
 * clan's goes to the clan host. On the clan host the dashboard and /jonnybot move to the JonnyBot host. A name under the domain
 * that is neither (a typo) goes to the clan site.
 */

/** JonnyBot's own pages: the first path segment, as shown on its host, and the folder under /jonnybot that serves it. */
const OWN_PAGES = new Set(["docs", "install", "faq", "privacy", "terms"]);
/** What the JonnyBot host serves as it is, from the shared app. */
const SHARED = new Set(["dashboard", "api", "_next"]);

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const segment = pathname.split("/")[1] ?? "";

  const faced = (face: "jonnybot" | "clan") => {
    const headers = new Headers(request.headers);
    headers.set(FACE_HEADER, face);
    return headers;
  };
  const pass = (face: "jonnybot" | "clan") => NextResponse.next({ request: { headers: faced(face) } });

  if (!subdomainMode()) return pass(segment === "jonnybot" || segment === "dashboard" ? "jonnybot" : "clan");

  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();
  const scheme = schemeFor(host, request.headers.get("x-forwarded-proto"));
  const to = (targetHost: string, path: string) => NextResponse.redirect(`${scheme}://${targetHost}${path}${search}`, 308);
  const rewrite = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    return NextResponse.rewrite(url, { request: { headers: faced("jonnybot") } });
  };

  const apex = apexHost();
  const kind = classifyHost(host, apex);

  if (kind === "unknown") return to(clanHostOf(host, apex), pathname);

  if (kind === "jonnybot") {
    if (pathname === "/") return rewrite("/jonnybot");
    if (OWN_PAGES.has(segment)) return rewrite(`/jonnybot${pathname}`);
    if (segment === "jonnybot") {
      // /jonnybot/... is the internal path: the visible one has no prefix (its generated images are the exception)
      if (/^\/jonnybot\/(opengraph-image|icon)/.test(pathname)) return pass("jonnybot");
      return to(host, pathname.slice("/jonnybot".length) || "/");
    }
    if (SHARED.has(segment) || /\.[a-z0-9]{2,6}$/i.test(pathname)) return pass("jonnybot");
    return to(clanHostOf(host, apex), pathname);
  }

  if (segment === "dashboard") return to(jonnybotHostOf(host, apex), pathname);
  if (segment === "jonnybot") return to(jonnybotHostOf(host, apex), pathname.slice("/jonnybot".length) || "/");
  return pass("clan");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
