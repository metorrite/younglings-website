import type { SiteBlock } from "@/lib/clanSites";
import { safeImageUrl } from "@/lib/clanSiteTheme";
import { safeHref } from "@/lib/miniMarkdown";
import { Markdown } from "./Markdown";

const text = (v: unknown, max: number): string => (typeof v === "string" ? v.slice(0, max) : "");

/** The clan's own content on one page, in order. A block whose content doesn't check out (an unsafe image or link) is left out. */
export function Blocks({ blocks, page }: { blocks: SiteBlock[]; page: string }) {
  const mine = blocks.filter((b) => b.page === page).sort((a, b) => a.position - b.position);
  if (mine.length === 0) return null;
  return (
    <div className="space-y-8">
      {mine.map((b) => (
        <Block key={`${b.page}-${b.position}`} block={b} />
      ))}
    </div>
  );
}

function Block({ block }: { block: SiteBlock }) {
  if (block.kind === "TEXT") {
    const md = text(block.body.markdown, 5000);
    return md ? <Markdown source={md} /> : null;
  }
  if (block.kind === "IMAGE") {
    const url = safeImageUrl(block.body.url);
    if (!url) return null;
    const caption = text(block.body.caption, 200);
    return (
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element -- a clan's own image from the host it chose */}
        <img src={url} alt={text(block.body.alt, 200)} className="w-full rounded-lg border border-[var(--cs-border)] object-cover" />
        {caption && <figcaption className="mt-2 text-sm text-[var(--cs-muted)]">{caption}</figcaption>}
      </figure>
    );
  }
  const links = (Array.isArray(block.body.links) ? block.body.links : [])
    .map((l) => (l && typeof l === "object" ? { label: text((l as Record<string, unknown>).label, 60), href: safeHref(text((l as Record<string, unknown>).url, 500)) } : null))
    .filter((l): l is { label: string; href: string } => Boolean(l?.label && l.href))
    .slice(0, 12);
  if (links.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-3">
      {links.map((l) => (
        <li key={l.href + l.label}>
          <a href={l.href} rel="nofollow noopener noreferrer" target="_blank" className="inline-block rounded-md border border-[var(--cs-border)] bg-[var(--cs-surface)] px-4 py-2 text-sm font-medium hover:border-[var(--cs-primary)]">
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
