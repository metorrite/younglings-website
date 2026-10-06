import Image from "next/image";
import Link from "next/link";
import { getAdminIfAny } from "@/lib/admin";
import { discordPath, getEvents, getNews, type NewsEmbed, type NewsPost } from "@/lib/site";
import { DiscordLink } from "./DiscordLink";
import { DiscordText } from "./DiscordText";
import { LocalTime } from "./LocalTime";
import { Unavailable } from "./blocks";

const MAX_TEXT = 900;

function clip(text: string): { text: string; clipped: boolean } {
  if (text.length <= MAX_TEXT) return { text, clipped: false };
  // Cut at a paragraph or line break near the limit so a heading or list isn't sliced mid-line.
  const cut = text.lastIndexOf("\n", MAX_TEXT);
  return { text: `${text.slice(0, cut > MAX_TEXT / 2 ? cut : MAX_TEXT).trimEnd()}…`, clipped: true };
}

function Embed({ embed }: { embed: NewsEmbed }) {
  const accent = embed.color > 0 ? `#${embed.color.toString(16).padStart(6, "0")}` : "#4b5563";
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-surface-border bg-background/50" style={{ borderLeft: `3px solid ${accent}` }}>
      <div className="space-y-1.5 p-3">
        {embed.author && <p className="text-xs text-muted">{embed.author}</p>}
        {embed.title &&
          (embed.url && /^https?:\/\//.test(embed.url) ? (
            <a href={embed.url} target="_blank" rel="noreferrer noopener" className="block text-sm font-semibold text-sky-400 hover:underline">
              {embed.title}
            </a>
          ) : (
            <p className="text-sm font-semibold">{embed.title}</p>
          ))}
        {embed.description && <DiscordText text={clip(embed.description).text} className="text-foreground/90" />}
        {embed.fields.length > 0 && (
          <dl className="grid gap-2 pt-1 sm:grid-cols-2">
            {embed.fields.map((f, i) => (
              <div key={i} className={f.inline ? "" : "sm:col-span-2"}>
                <dt className="text-xs font-semibold text-foreground">{f.name}</dt>
                <dd className="text-sm text-muted">
                  <DiscordText text={f.value} />
                </dd>
              </div>
            ))}
          </dl>
        )}
        {embed.footer && <p className="pt-1 text-[11px] text-muted">{embed.footer}</p>}
      </div>
      {embed.image && (
        // eslint-disable-next-line @next/next/no-img-element -- embed images can live on any host
        <img src={embed.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="max-h-72 w-full object-cover" />
      )}
    </div>
  );
}

function Post({ post }: { post: NewsPost }) {
  const { text, clipped } = clip(post.text);
  const images = post.images.slice(0, 4);

  return (
    <article className="rounded-xl border border-surface-border bg-background/40 p-4 transition hover:border-gold/30">
      <header className="flex items-center gap-3">
        <Image src={post.avatarUrl} alt="" width={36} height={36} className="rounded-full" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className="font-semibold">{post.author}</span>
            <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[11px] font-medium text-gold">{post.channel}</span>
            {post.pinned && <span title="Pinned in Discord">📌</span>}
          </p>
          <p className="text-xs text-muted">
            <LocalTime iso={post.postedAt} mode="relative" />
            {post.editedAt && " · edited"}
          </p>
        </div>
      </header>

      {text && <DiscordText text={text} className="mt-3 text-foreground/90" />}

      {images.length > 0 && (
        <div className={`mt-3 grid gap-2 ${images.length === 1 ? "" : "grid-cols-2"}`}>
          {images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- Discord media can come from several hosts
            <img key={i} src={src} alt="" loading="lazy" referrerPolicy="no-referrer" className={`w-full rounded-lg border border-surface-border/60 object-cover ${images.length === 1 ? "max-h-96" : "h-40"}`} />
          ))}
        </div>
      )}

      {post.embeds.map((embed, i) => (
        <Embed key={i} embed={embed} />
      ))}

      <footer className="mt-3 flex items-center justify-between text-xs text-muted">
        <span>{post.images.length > images.length ? `+${post.images.length - images.length} more images` : ""}</span>
        <DiscordLink path={discordPath(post.url)} className="hover:text-gold">
          {clipped ? "Read the rest in Discord ↗" : "Open in Discord ↗"}
        </DiscordLink>
      </footer>
    </article>
  );
}

/** The centre of the home page: upcoming events and the latest announcements, news and event posts from Discord. */
export async function NewsBlock() {
  const [posts, events, admin] = await Promise.all([getNews(), getEvents(), getAdminIfAny()]);
  const upcoming = (events ?? []).slice(0, 3);

  return (
    <section className="rounded-xl border border-surface-border bg-surface/90">
      <div className="flex items-center justify-between border-b border-surface-border px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-gold uppercase">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          From Discord
        </h2>
        <span className="flex items-center gap-4 text-xs">
          {admin && (
            <Link href="/admin/news" className="rounded-full border border-dashed border-gold/40 px-2.5 py-0.5 text-gold hover:bg-gold/10" title="Only admins see this">
              🛡️ Manage channels
            </Link>
          )}
          <Link href="/events" className="text-muted hover:text-gold">
            All events →
          </Link>
        </span>
      </div>

      {upcoming.length > 0 && (
        <ul className="grid gap-px border-b border-surface-border bg-surface-border sm:grid-cols-3">
          {upcoming.map((event) => (
            <li key={event.id} className="bg-surface">
              <DiscordLink path={discordPath(event.url)} className="block h-full px-4 py-3 transition hover:bg-white/5" title="Open this event in Discord">
                <p className="text-[11px] font-semibold tracking-wider text-gold uppercase">{event.status === "ACTIVE" ? "Live now" : <LocalTime iso={event.startTime} mode="relative" />}</p>
                <p className="mt-0.5 truncate text-sm font-medium">{event.name}</p>
                <p className="truncate text-xs text-muted">
                  <LocalTime iso={event.startTime} />
                </p>
              </DiscordLink>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-4 p-4">
        {posts === null ? (
          <Unavailable what="The news feed" />
        ) : posts.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No announcements to show yet. Admins choose which Discord channels appear here from the dashboard.</p>
        ) : (
          posts.map((post) => <Post key={`${post.channel}-${post.id}`} post={post} />)
        )}
      </div>
    </section>
  );
}
