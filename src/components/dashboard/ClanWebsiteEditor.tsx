"use client";

import { useMemo, useState, useTransition } from "react";
import { FormField, ghostButton, inputClass, Notice, primaryButton, dangerButton } from "@/components/admin/ui";
import { Blocks } from "@/components/clansite/Blocks";
import { SiteShell, SiteHeading } from "@/components/clansite/SiteShell";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { SaveBar } from "@/components/dashboard/ui/SaveBar";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import type { SiteContext } from "@/lib/clanSitePage";
import type { SiteBlock, TenantSite } from "@/lib/clanSites";
import { FONTS, PAGES, PALETTE, parsePages, parseTheme, TEMPLATES, type PageKey, type SiteTemplate } from "@/lib/clanSiteTheme";
import type { ClanSiteAdmin, ClanSiteBlockData, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Result = WelcomeActionResult<ClanSiteAdmin>;
type Outcome = { tone: "error" | "success"; title: string; items?: string[] } | null;

export interface ClanWebsiteActions {
  save: (draft: SettingsDraft) => Promise<Result>;
  saveBlocks: (page: string, blocks: BlockDraft[]) => Promise<Result>;
  publish: (publish: boolean) => Promise<Result>;
  takedown: (reason: string | null) => Promise<Result>;
}

interface ThemeDraft {
  primary: string;
  accent: string;
  font: string;
  logoUrl: string;
  bannerUrl: string;
}
interface PageDraft {
  key: PageKey;
  enabled: boolean;
  title: string;
  showJoined?: boolean;
}
export interface SettingsDraft {
  enabled: boolean;
  template: SiteTemplate;
  theme: ThemeDraft;
  pages: PageDraft[];
}
export interface BlockDraft {
  kind: ClanSiteBlockData["kind"];
  body: Record<string, unknown>;
}

const BLOCK_PAGES: PageKey[] = ["home", "about", "apply", "custom1", "custom2", "custom3"];
const DATA_PAGES = new Set<PageKey>(["roster", "stats", "events", "recaps"]);
const label = (key: PageKey) => PAGES.find((p) => p.key === key)!.label;
const str = (v: unknown) => (typeof v === "string" ? v : "");

function settingsOf(data: ClanSiteAdmin): SettingsDraft {
  const t = data.site.theme;
  return {
    enabled: data.site.enabled,
    template: data.site.template,
    theme: { primary: str(t.primary), accent: str(t.accent), font: str(t.font), logoUrl: str(t.logoUrl), bannerUrl: str(t.bannerUrl) },
    pages: parsePages(data.site.pages).map((p) => {
      // A title is only kept when the clan set one (a standard page's own name, or a custom page's placeholder, is left blank).
      const def = PAGES.find((d) => d.key === p.key)!;
      const page: PageDraft = { key: p.key, enabled: p.enabled, title: p.title === def.label ? "" : p.title };
      if (p.key === "roster") page.showJoined = p.showJoined === true;
      return page;
    }),
  };
}

function blocksOf(data: ClanSiteAdmin): Record<string, BlockDraft[]> {
  const out: Record<string, BlockDraft[]> = {};
  for (const b of [...data.blocks].sort((a, z) => a.position - z.position)) (out[b.page] ??= []).push({ kind: b.kind, body: b.body });
  return out;
}

const shape = (v: unknown) => JSON.stringify(v);

/** The dashboard's Clan website page: switch the site on, choose its look and pages, write its blocks, see it live, publish it. */
export function ClanWebsiteEditor({
  initial,
  clan,
  siteUrl,
  downloadHref,
  profileHref,
  actions,
}: {
  initial: ClanSiteAdmin;
  clan: { name: string; tagline: string; description: string; logoUrl: string | null };
  siteUrl: string | null;
  downloadHref: string;
  profileHref: string;
  actions: ClanWebsiteActions;
}) {
  const [data, setData] = useState(initial);
  const [saved, setSaved] = useState(() => settingsOf(initial));
  const [draft, setDraft] = useState(() => settingsOf(initial));
  const [blocks, setBlocks] = useState(() => blocksOf(initial));
  const [savedBlocks, setSavedBlocks] = useState(() => blocksOf(initial));
  const [blockPage, setBlockPage] = useState<PageKey>("home");
  const [previewPath, setPreviewPath] = useState("");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [blockOutcome, setBlockOutcome] = useState<Outcome>(null);
  const [statusOutcome, setStatusOutcome] = useState<Outcome>(null);
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const [blockPending, startBlocks] = useTransition();
  const [statusPending, startStatus] = useTransition();
  const dirty = shape(draft) !== shape(saved);
  const blocksDirty = shape(blocks[blockPage] ?? []) !== shape(savedBlocks[blockPage] ?? []);
  const locked = !data.inBeta;
  const takenDown = Boolean(data.site.takedownReason);

  const apply = (result: Result, ok: string, set: (o: Outcome) => void) => {
    if (!result.ok) return set({ tone: "error", title: result.error, items: result.problems });
    setData(result.data);
    const s = settingsOf(result.data);
    setSaved(s);
    setDraft(s);
    const b = blocksOf(result.data);
    setSavedBlocks(b);
    setBlocks((current) => ({ ...current, ...b }));
    set({ tone: "success", title: ok });
  };
  const change = (patch: Partial<SettingsDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setOutcome(null);
  };
  const setTheme = (patch: Partial<ThemeDraft>) => change({ theme: { ...draft.theme, ...patch } });
  const setPage = (key: PageKey, patch: Partial<PageDraft>) => change({ pages: draft.pages.map((p) => (p.key === key ? { ...p, ...patch } : p)) });
  const movePage = (index: number, by: -1 | 1) => {
    const next = [...draft.pages];
    const to = index + by;
    if (to < 1 || to >= next.length) return; // Home stays first
    [next[index], next[to]] = [next[to], next[index]];
    change({ pages: next });
  };

  const pageBlocks = blocks[blockPage] ?? [];
  const setPageBlocks = (list: BlockDraft[]) => {
    setBlocks((b) => ({ ...b, [blockPage]: list }));
    setBlockOutcome(null);
  };

  // The live preview: the same frame and blocks the published site uses, from what is on screen now (saved or not).
  const ctx = useMemo<SiteContext>(() => {
    const template = draft.template;
    const themeRaw = { ...draft.theme, logoUrl: draft.theme.logoUrl || undefined, bannerUrl: draft.theme.bannerUrl || undefined };
    const site: TenantSite = {
      slug: data.slug ?? "your-clan",
      clan: {
        slug: data.slug ?? "your-clan", name: clan.name || "Your clan", tagline: clan.tagline, logoUrl: clan.logoUrl, colour: null, focus: [],
        recruiting: { key: "OPEN", label: "Recruiting" }, clanName: null, verified: false, listed: false, memberCount: null, onLeaderboards: false,
        description: clan.description, requirements: "", applyUrl: null, timezone: null, updatedAt: null,
      },
      template,
      theme: themeRaw,
      pages: draft.pages,
      blocks: Object.entries(blocks).flatMap(([page, list]) => list.map((b, position): SiteBlock => ({ page, position, kind: b.kind, body: b.body }))),
      publishedAt: null,
    };
    return { site, template, theme: parseTheme(themeRaw, template), pages: parsePages(draft.pages) };
  }, [draft, blocks, data.slug, clan]);
  const previewPage = ctx.pages.find((p) => p.path === previewPath && p.enabled) ?? ctx.pages[0];

  function save() {
    setOutcome(null);
    start(async () => apply(await actions.save(draft), "Saved.", setOutcome));
  }
  function saveBlocks() {
    setBlockOutcome(null);
    startBlocks(async () => apply(await actions.saveBlocks(blockPage, pageBlocks), "Blocks saved.", setBlockOutcome));
  }
  function publish(on: boolean) {
    setStatusOutcome(null);
    startStatus(async () => apply(await actions.publish(on), on ? "Published." : "Unpublished: the site is offline.", setStatusOutcome));
  }
  function takedown(restore: boolean) {
    setStatusOutcome(null);
    startStatus(async () => apply(await actions.takedown(restore ? null : reason), restore ? "Restored: the clan can publish again." : "Taken down.", setStatusOutcome));
  }

  return (
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,40rem)]">
      <div className="min-w-0 space-y-4">
        <CollapsibleCard
          id="cw-status"
          title="Your website"
          hint="Switch it on, publish it, and where it lives."
          defaultOpen
          summary={
            <>
              <Chip tone={data.site.published ? "good" : "plain"}>{data.site.published ? "Published" : data.site.enabled ? "Draft" : "Off"}</Chip>
              {takenDown && <Chip tone="bad">Taken down</Chip>}
            </>
          }
          info="Your website shows your clan profile's name and logo, and fills its Roster, Stats, Events and Recaps pages from JonnyBot's data. Members who chose to stay out of the rankings never appear."
        >
          {locked && <Notice tone="error" title="The website builder is in beta: it is open to servers on JonnyBot's beta list for now." />}
          {takenDown && <Notice tone="error" title="JonnyBot's owner took this website down." items={[data.site.takedownReason!, "Change what was reported, then ask for it to be restored."]} />}
          {data.profileProblem && (
            <div className="space-y-1">
              <Notice tone="error" title={data.profileProblem} />
              <a href={profileHref} className="text-sm text-gold underline">
                Open the Clan profile page
              </a>
            </div>
          )}
          <Toggle
            checked={draft.enabled}
            onChange={(on) => change({ enabled: on })}
            disabled={locked}
            label="Website switched on"
            detail="Off: nothing is shown and it is unpublished. Your settings are kept for 30 days, then deleted."
          />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className={primaryButton} disabled={statusPending || locked || !saved.enabled || dirty || takenDown || Boolean(data.profileProblem)} onClick={() => publish(true)}>
              {data.site.published ? "Publish changes" : "Publish"}
            </button>
            {data.site.published && (
              <button type="button" className={ghostButton} disabled={statusPending} onClick={() => publish(false)}>
                Unpublish
              </button>
            )}
            <a className={ghostButton} href={downloadHref}>
              Download my site
            </a>
            {dirty && <span className="text-xs text-muted">Save your changes before publishing.</span>}
          </div>
          {siteUrl && (
            <p className="text-sm text-muted">
              Address:{" "}
              {data.site.published ? (
                <a href={siteUrl} target="_blank" rel="noopener noreferrer" className="text-gold underline">
                  {siteUrl}
                </a>
              ) : (
                <span className="text-foreground">{siteUrl}</span>
              )}{" "}
              {!data.site.published && "(after publishing)"}
            </p>
          )}
          <p className="text-xs text-muted">
            By publishing you confirm the website follows JonnyBot&apos;s rules: no hate, harassment, scams, real-money trading or other people&apos;s personal details. Every page has a Report
            link that reaches JonnyBot&apos;s owner.
          </p>
          {statusOutcome && <Notice tone={statusOutcome.tone} title={statusOutcome.title} items={statusOutcome.items} />}
        </CollapsibleCard>

        <CollapsibleCard id="cw-look" title="Look" hint="Template, colours, font, logo and banner." summary={<Chip>{TEMPLATES.find((t) => t.key === draft.template)?.label}</Chip>}>
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Template">
            {TEMPLATES.map((t) => (
              <button
                key={t.key}
                type="button"
                role="radio"
                aria-checked={draft.template === t.key}
                onClick={() => change({ template: t.key })}
                className={`rounded-lg border p-3 text-left transition ${draft.template === t.key ? "border-gold bg-gold/10" : "border-surface-border hover:border-gold/50"}`}
              >
                <span className="block font-semibold">{t.label}</span>
                <span className="mt-1 block text-xs text-muted">{t.hint}</span>
              </button>
            ))}
          </div>
          {(["primary", "accent"] as const).map((which) => (
            <FormField key={which} label={which === "primary" ? "Main colour" : "Second colour"} as="group" hint={which === "primary" ? "Buttons, links and the menu." : "Small accents under headings."}>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={which}>
                {PALETTE.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    role="radio"
                    aria-checked={draft.theme[which] === c.key}
                    title={c.label}
                    onClick={() => setTheme({ [which]: draft.theme[which] === c.key ? "" : c.key })}
                    className={`h-8 w-8 rounded-full border-2 ${draft.theme[which] === c.key ? "border-foreground" : "border-transparent"}`}
                    style={{ background: c.hex }}
                  >
                    <span className="sr-only">{c.label}</span>
                  </button>
                ))}
              </div>
            </FormField>
          ))}
          <FormField label="Font">
            <select className={inputClass} value={draft.theme.font} onChange={(e) => setTheme({ font: e.target.value })}>
              <option value="">The template&apos;s own</option>
              {FONTS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Logo" hint="An https:// image address. Empty: your clan profile's logo.">
            <input className={inputClass} value={draft.theme.logoUrl} maxLength={data.limits.url} placeholder="https://" onChange={(e) => setTheme({ logoUrl: e.target.value })} />
          </FormField>
          <FormField label="Banner" hint="An https:// image address, wide (about 1600 by 400).">
            <input className={inputClass} value={draft.theme.bannerUrl} maxLength={data.limits.url} placeholder="https://" onChange={(e) => setTheme({ bannerUrl: e.target.value })} />
          </FormField>
        </CollapsibleCard>

        <CollapsibleCard id="cw-pages" title="Pages" hint="Which pages show, in what order, and your own pages." summary={<Chip>{draft.pages.filter((p) => p.enabled).length} shown</Chip>}>
          <ul className="space-y-2">
            {draft.pages.map((p, i) => {
              const custom = p.key.startsWith("custom");
              return (
                <li key={p.key} className="rounded-lg border border-surface-border p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Toggle checked={p.enabled} disabled={p.key === "home"} onChange={(on) => setPage(p.key, { enabled: on })} label={custom ? p.title || `Your page ${p.key.slice(-1)}` : label(p.key)} detail={DATA_PAGES.has(p.key) ? "Filled from JonnyBot's data." : undefined} />
                    <span className="ml-auto flex gap-1">
                      <button type="button" className={ghostButton} disabled={i <= 1} onClick={() => movePage(i, -1)} aria-label={`Move ${label(p.key)} up`}>
                        ↑
                      </button>
                      <button type="button" className={ghostButton} disabled={i === 0 || i === draft.pages.length - 1} onClick={() => movePage(i, 1)} aria-label={`Move ${label(p.key)} down`}>
                        ↓
                      </button>
                    </span>
                  </div>
                  {(custom || p.enabled) && p.key !== "home" && (
                    <div className="mt-2">
                      <input
                        className={inputClass}
                        value={p.title}
                        maxLength={data.limits.title}
                        placeholder={custom ? "Page title (needed to show it)" : `Menu name (default: ${label(p.key)})`}
                        onChange={(e) => setPage(p.key, { title: e.target.value })}
                        aria-label={`Title of ${label(p.key)}`}
                      />
                    </div>
                  )}
                  {p.key === "roster" && p.enabled && (
                    <div className="mt-2">
                      <Toggle checked={p.showJoined === true} onChange={(on) => setPage(p.key, { showJoined: on })} label="Show when each member joined" />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </CollapsibleCard>

        <SaveBar pending={pending} onSave={save} outcome={outcome} dirty={dirty} onDiscard={() => setDraft(saved)} />

        <CollapsibleCard id="cw-blocks" title="Your content" hint="Text, pictures and link buttons on Home, About, Apply and your own pages." summary={<Chip>{Object.values(savedBlocks).reduce((n, l) => n + l.length, 0)} blocks</Chip>}>
          <FormField label="Page">
            <select className={inputClass} value={blockPage} onChange={(e) => setBlockPage(e.target.value as PageKey)}>
              {BLOCK_PAGES.map((key) => (
                <option key={key} value={key}>
                  {draft.pages.find((p) => p.key === key)?.title || label(key)}
                </option>
              ))}
            </select>
          </FormField>
          <BlockList blocks={pageBlocks} onChange={setPageBlocks} max={data.limits.blocksPerPage} markdownMax={data.limits.markdown} linksMax={data.limits.links} />
          <SaveBar inline pending={blockPending} onSave={saveBlocks} outcome={blockOutcome} label="Save this page's blocks" dirty={blocksDirty} onDiscard={() => setPageBlocks(savedBlocks[blockPage] ?? [])} />
        </CollapsibleCard>

        {data.isOwner && (
          <CollapsibleCard id="cw-owner" title="Owner: take down" hint="Only you see this. For a website that broke the rules (a report was upheld)." summary={takenDown ? <Chip tone="bad">Taken down</Chip> : undefined}>
            {takenDown ? (
              <button type="button" className={ghostButton} disabled={statusPending} onClick={() => takedown(true)}>
                Restore (let them publish again)
              </button>
            ) : (
              <div className="space-y-2">
                <FormField label="Reason the clan will see">
                  <input className={inputClass} value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} />
                </FormField>
                <button type="button" className={dangerButton} disabled={statusPending || reason.trim().length < 5} onClick={() => takedown(false)}>
                  Take the website down
                </button>
              </div>
            )}
          </CollapsibleCard>
        )}
      </div>

      <div className="min-w-0">
        <div className="sticky top-4 space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted">Live preview (not saved until you save)</p>
          <div className="max-h-[80vh] overflow-auto rounded-xl border border-surface-border">
            <SiteShell ctx={ctx} preview={{ current: previewPage.path, pick: setPreviewPath }}>
              <SiteHeading title={previewPage.key === "home" ? ctx.site.clan.name : previewPage.title} />
              {DATA_PAGES.has(previewPage.key) ? (
                <p className="text-sm text-[var(--cs-muted)]">This page fills itself from your clan&apos;s data once the website is published.</p>
              ) : (
                <Blocks blocks={ctx.site.blocks} page={previewPage.key} />
              )}
            </SiteShell>
          </div>
        </div>
      </div>
    </div>
  );
}

/** One page's blocks: add, edit, move and remove text, image and links blocks. */
function BlockList({ blocks, onChange, max, markdownMax, linksMax }: { blocks: BlockDraft[]; onChange: (b: BlockDraft[]) => void; max: number; markdownMax: number; linksMax: number }) {
  const set = (i: number, body: Record<string, unknown>) => onChange(blocks.map((b, j) => (j === i ? { ...b, body } : b)));
  const move = (i: number, by: -1 | 1) => {
    const to = i + by;
    if (to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[to]] = [next[to], next[i]];
    onChange(next);
  };
  const add = (kind: BlockDraft["kind"]) => onChange([...blocks, { kind, body: kind === "TEXT" ? { markdown: "" } : kind === "IMAGE" ? { url: "", alt: "", caption: "" } : { links: [{ label: "", url: "" }] } }]);
  return (
    <div className="space-y-3">
      {blocks.length === 0 && <p className="text-sm text-muted">No blocks on this page yet.</p>}
      {blocks.map((b, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-surface-border p-3">
          <div className="flex items-center gap-2">
            <Chip>{b.kind === "TEXT" ? "Text" : b.kind === "IMAGE" ? "Picture" : "Links"}</Chip>
            <span className="ml-auto flex gap-1">
              <button type="button" className={ghostButton} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move block up">
                ↑
              </button>
              <button type="button" className={ghostButton} disabled={i === blocks.length - 1} onClick={() => move(i, 1)} aria-label="Move block down">
                ↓
              </button>
              <button type="button" className={ghostButton} onClick={() => onChange(blocks.filter((_, j) => j !== i))}>
                Remove
              </button>
            </span>
          </div>
          {b.kind === "TEXT" && (
            <FormField label="Text" hint="# Heading, **bold**, *italic*, - lists, 1. numbered lists, [link](https://...). No HTML.">
              <textarea className={`${inputClass} min-h-32 font-mono text-sm`} maxLength={markdownMax} value={str(b.body.markdown)} onChange={(e) => set(i, { markdown: e.target.value })} />
            </FormField>
          )}
          {b.kind === "IMAGE" && (
            <>
              <FormField label="Picture address" hint="https:// only.">
                <input className={inputClass} placeholder="https://" value={str(b.body.url)} onChange={(e) => set(i, { ...b.body, url: e.target.value })} />
              </FormField>
              <FormField label="Describe it (for screen readers)">
                <input className={inputClass} maxLength={200} value={str(b.body.alt)} onChange={(e) => set(i, { ...b.body, alt: e.target.value })} />
              </FormField>
              <FormField label="Caption (optional)">
                <input className={inputClass} maxLength={200} value={str(b.body.caption)} onChange={(e) => set(i, { ...b.body, caption: e.target.value })} />
              </FormField>
            </>
          )}
          {b.kind === "LINKS" && <LinksEditor links={Array.isArray(b.body.links) ? (b.body.links as { label?: string; url?: string }[]) : []} max={linksMax} onChange={(links) => set(i, { links })} />}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {(["TEXT", "IMAGE", "LINKS"] as const).map((kind) => (
          <button key={kind} type="button" className={ghostButton} disabled={blocks.length >= max} onClick={() => add(kind)}>
            + {kind === "TEXT" ? "Text" : kind === "IMAGE" ? "Picture" : "Link buttons"}
          </button>
        ))}
      </div>
    </div>
  );
}

function LinksEditor({ links, max, onChange }: { links: { label?: string; url?: string }[]; max: number; onChange: (l: { label: string; url: string }[]) => void }) {
  const rows = links.map((l) => ({ label: str(l.label), url: str(l.url) }));
  const set = (i: number, patch: Partial<{ label: string; url: string }>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[12rem_1fr_auto]">
          <input className={inputClass} placeholder="Button text" maxLength={60} value={r.label} onChange={(e) => set(i, { label: e.target.value })} aria-label="Button text" />
          <input className={inputClass} placeholder="https://" value={r.url} onChange={(e) => set(i, { url: e.target.value })} aria-label="Link address" />
          <button type="button" className={ghostButton} onClick={() => onChange(rows.filter((_, j) => j !== i))}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className={ghostButton} disabled={rows.length >= max} onClick={() => onChange([...rows, { label: "", url: "" }])}>
        + Add a link
      </button>
    </div>
  );
}
