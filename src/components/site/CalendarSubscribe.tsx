import { headers } from "next/headers";
import { calendarFeedsOn, webcalHref } from "@/lib/ics";
import { apiOriginFor } from "@/lib/siteHosts";

/**
 * "Subscribe in your calendar": a webcal:// link to an events feed (T-192), and the plain address for apps that want it pasted. Renders nothing
 * while the feeds are off (CALENDAR_FEEDS unset). `path` is the feed's path; `api` puts it on the public API's host (the clans' feeds live
 * under /api/v1) instead of the page's own.
 */
export async function CalendarSubscribe({ path, api = false, className = "" }: { path: string; api?: boolean; className?: string }) {
  if (!calendarFeedsOn()) return null;
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = (api ? apiOriginFor(host, proto) : null) ?? `${proto}://${host}`;
  const url = `${origin}${path}`;
  return (
    <details className={`text-sm text-muted ${className}`}>
      <summary className="cursor-pointer select-none hover:text-foreground">
        <a href={webcalHref(url)} className="font-medium text-gold hover:underline">
          Subscribe in your calendar
        </a>
        <span> · new events show up on their own</span>
      </summary>
      <p className="mt-2">
        If your calendar app asks for an address, paste: <code className="select-all break-all font-mono text-xs text-foreground">{url}</code>
      </p>
    </details>
  );
}
