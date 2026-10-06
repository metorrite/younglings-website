import type { ReactNode } from "react";

/**
 * Renders the Discord-flavoured text of a post: headings, bullet lists, quotes, bold / italic / underline /
 * strikethrough, inline code, links and `<t:…>` timestamps. Everything becomes React elements — never raw HTML —
 * and only http(s) links are made clickable, so a post can't smuggle anything onto the page.
 */

const INLINE = /(\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|`[^`\n]+`|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|https?:\/\/[^\s<>)]+|<t:\d+(?::[a-zA-Z])?>|\*[^*\n]+\*|_[^_\n]+_)/g;

function timestamp(seconds: number): string {
  const d = new Date(seconds * 1000);
  return `${d.toLocaleString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} UTC`;
}

function inline(text: string, keyPrefix = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let n = 0;
  for (const match of text.matchAll(INLINE)) {
    const token = match[0];
    const start = match.index ?? 0;
    if (start > last) out.push(text.slice(last, start));
    const key = `${keyPrefix}-${n++}`;

    if (token.startsWith("**")) out.push(<strong key={key}>{inline(token.slice(2, -2), key)}</strong>);
    else if (token.startsWith("__")) out.push(<u key={key}>{inline(token.slice(2, -2), key)}</u>);
    else if (token.startsWith("~~")) out.push(<s key={key}>{inline(token.slice(2, -2), key)}</s>);
    else if (token.startsWith("`")) out.push(<code key={key} className="rounded bg-white/10 px-1 py-0.5 text-[0.85em]">{token.slice(1, -1)}</code>);
    else if (token.startsWith("[")) {
      const m = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
      out.push(m ? <ExternalLink key={key} href={m[2]}>{m[1]}</ExternalLink> : token);
    } else if (token.startsWith("http")) out.push(<ExternalLink key={key} href={token}>{token.length > 48 ? `${token.slice(0, 46)}…` : token}</ExternalLink>);
    else if (token.startsWith("<t:")) out.push(<span key={key} className="text-foreground">{timestamp(Number(token.match(/\d+/)![0]))}</span>);
    else out.push(<em key={key}>{inline(token.slice(1, -1), key)}</em>);

    last = start + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="text-sky-400 underline-offset-2 hover:underline">
      {children}
    </a>
  );
}

export function DiscordText({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let list: ReactNode[] = [];
  let k = 0;

  const flushList = () => {
    if (list.length > 0) {
      blocks.push(
        <ul key={`l${k++}`} className="my-1 list-disc space-y-0.5 pl-5">
          {list}
        </ul>,
      );
      list = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*(?:[-*•])\s+(.*)$/);
    if (bullet) {
      list.push(<li key={`b${k++}`}>{inline(bullet[1])}</li>);
      continue;
    }
    flushList();

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const size = heading[1].length === 1 ? "text-lg" : heading[1].length === 2 ? "text-base" : "text-sm";
      blocks.push(
        <p key={`h${k++}`} className={`${size} mt-2 font-semibold text-foreground`}>
          {inline(heading[2])}
        </p>,
      );
    } else if (line.startsWith("-# ")) {
      blocks.push(
        <p key={`s${k++}`} className="text-xs text-muted">
          {inline(line.slice(3))}
        </p>,
      );
    } else if (line.startsWith("> ")) {
      blocks.push(
        <blockquote key={`q${k++}`} className="my-1 border-l-2 border-gold/50 pl-3 text-muted">
          {inline(line.slice(2))}
        </blockquote>,
      );
    } else if (line.trim() === "") {
      blocks.push(<div key={`e${k++}`} className="h-2" />);
    } else {
      blocks.push(<p key={`p${k++}`}>{inline(line)}</p>);
    }
  }
  flushList();

  return <div className={`space-y-0.5 text-sm leading-relaxed ${className}`}>{blocks}</div>;
}
