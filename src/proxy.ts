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

  // The API host is independent of the clan/JonnyBot split: api.<domain> serves only the API, with shorter paths. The long forms
  // (/api/v1/..., /api/ingest/v1/...) keep working on every host, so nothing already pointed at them breaks.
  const requestHost = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();
  if (classifyHost(requestHost, apexHost()) === "api") {
    // The API host is for programs. A person who types it into a browser address bar (or follows a link to it) is sent to the clan site's
    // front page. Browsers say what they are doing: a page navigation carries Sec-Fetch-Dest: document (or Mode: navigate), and older ones
    // ask for text/html. A plugin, a script, curl and a website's own fetch() call do none of that, so they get the API as before.
    const dest = request.headers.get("sec-fetch-dest");
    const mode = request.headers.get("sec-fetch-mode");
    const browsing = dest === "document" || dest === "iframe" || mode === "navigate" || (!mode && /text\/html/i.test(request.headers.get("accept") ?? ""));
    if (browsing) return NextResponse.redirect(`${schemeFor(requestHost, request.headers.get("x-forwarded-proto"))}://${clanHostOf(requestHost, apexHost())}/`, 307);
    const rewriteApi = (path: string) => {
      const url = request.nextUrl.clone();
      url.pathname = path;
      return NextResponse.rewrite(url);
    };
    if (pathname === "/") return rewriteApi("/api/v1");
    if (pathname === "/openapi.yaml") return rewriteApi("/openapi/jonnybot-v1.yaml");
    if (pathname === "/v1" || pathname.startsWith("/v1/")) return rewriteApi(`/api${pathname}`);
    if (pathname === "/ingest/v1" || pathname.startsWith("/ingest/v1/")) return rewriteApi(`/api${pathname}`);
    if (pathname.startsWith("/api/") || pathname.startsWith("/openapi/")) return NextResponse.next();
    return NextResponse.json({ apiVersion: 1, error: "Not found. See https://" + requestHost + "/ for the list of endpoints." }, { status: 404 });
  }

  const faced = (face: "jonnybot" | "clan") => {
    const headers = new Headers(request.headers);
    headers.set(FACE_HEADER, face);
    return headers;
  };
  const pass = (face: "jonnybot" | "clan") => NextResponse.next({ request: { headers: faced(face) } });

  if (!subdomainMode()) return pass(segment === "jonnybot" || segment === "dashboard" ? "jonnybot" : "clan");

  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").split(",")[0].trim();
  const scheme = schemeFor(host, request.headers.get("x-forwarded-proto"));
  // 307, not 308: a permanent redirect is remembered by browsers for good, which would strand people if the split is ever switched off.
  const to = (targetHost: string, path: string) => NextResponse.redirect(`${scheme}://${targetHost}${path}${search}`, 307);
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
