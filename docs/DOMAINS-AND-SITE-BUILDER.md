# Domain-agnostic hosts and the clan website builder (design)

Tickets T-063 (neutral domain: **config only**) and T-064 (clan website builder). Status: **draft with defaults** (Drake away, 2026-10-20). **Buying a domain and any DNS change are Drake's** (section 4). Every build here is flag-gated and **off by default**; with no new settings the site behaves exactly as today.

Related: `src/lib/siteHosts.ts`, `src/proxy.ts`, `src/lib/auth.ts`, memory notes `reference_infra_dns_hosting`, `project_backlog_clan_platform_ideas`, JonnyBot `docs/LINK-SYSTEM.md` (RS Link host), `docs/RUNESYNC-DESIGN.md` section 11 (plugin base URL), `docs/PREMIUM-PLAN.md` (money decisions).

---

## Part A: domain-agnostic hosts (T-063)

### A1. Today

One Next app on Railway, faces chosen by hostname in `siteHosts.classifyHost`: the clan site on the apex (`SITE_APEX_HOST`, else `AUTH_COOKIE_DOMAIN`), and fixed prefixes `jonnybot.`, `api.`, `clans.` on **the same apex**. Login shares one cookie across the apex (`AUTH_COOKIE_DOMAIN=.rsyounglings.com`) and completes on `NEXTAUTH_URL`'s host. The API origin given to plugins is `PUBLIC_API_ORIGIN` or `api.<apex>`. The bot has `BotConfig` site URL plus a few hard-coded `jonnybot.rsyounglings.com` strings in User-Agent headers.

The limit: every face must live under **one** apex. A neutral domain for the hub, events, API, RS Link and hosted clan sites, with the Younglings clan site staying on `rsyounglings.com`, needs **two apexes**.

### A2. The host map

One setting describes every face's canonical host; anything not set falls back to today's prefix rule, so nothing changes until the map is set.

```
SITE_HOSTS="clan=rsyounglings.com,jonnybot=jonnybot.rsclans.example,hub=rsclans.example,events=events.rsclans.example,api=api.rsclans.example,link=link.rsclans.example"
SITE_TENANT_SUFFIX="rsclans.example"          # <slug>.rsclans.example = a hosted clan site (Part B), empty = off
SITE_HOST_ALIASES="clans.rsyounglings.com=hub,jonnybot.rsyounglings.com=jonnybot,api.rsyounglings.com=api"
```

- `classifyHost` checks the map (exact host) first, then aliases, then the tenant suffix, then today's prefix rule.
- **Aliases for pages redirect (308) to the canonical host. Aliases for the API never redirect: they keep serving.** Plugins may only call their manifest URL and cannot follow redirects, so `api.rsyounglings.com` must answer for as long as any released plugin points at it.
- Reserved tenant slugs (never a clan site): `www, api, link, events, clans, jonnybot, admin, auth, mail, status, cdn, static, assets, dev, staging` plus anything in the map.
- `apiOriginFor`, `jonnybotHref`, `hubHref`, `clanHref` and a new `eventsHref`/`linkHref` read the map, so every cross-face link follows it.
- The ingest `whoami` already returns the canonical API base URL (memory decision 2026-10-11); it reads the same map.

### A3. Signing in across two apexes

A cookie cannot span two apexes. Design:

- `AUTH_COOKIE_DOMAINS=".rsyounglings.com,.rsclans.example"`: the session cookie is set for the apex of the host being used.
- The Discord sign-in completes on one **auth host** (`NEXTAUTH_URL`, default unchanged). After sign-in on the auth host, a visitor who started on the other apex is sent back through a **handoff**: the auth host issues a one-time code (random, 60 s, single use, bound to the target host), the target host's `/auth/handoff?code=` exchanges it server-to-server for a session and sets its own cookie. Same mechanism later serves custom clan domains (B6).
- Discord's OAuth redirect list then needs only the auth host. Old redirect URLs stay registered until the move is done (Drake's portal step).
- Not built when `AUTH_COOKIE_DOMAINS` has one entry (today).

### A4. What Drake does (cannot be done for him)

1. Choose and buy the neutral domain (candidate names to check availability: rsclans, clanhub-rs, rs3clans; the name must not contain "Discord", see LINK-SYSTEM section 15).
2. Cloudflare: add the zone, DNS records for each host in the map (CNAME to Railway), wildcard `*.domain` only if Part B goes live.
3. Railway: add each custom domain to the website service.
4. Discord developer portal: add the new auth host's redirect URL.
5. Railway env: set `SITE_HOSTS`, `SITE_HOST_ALIASES`, `AUTH_COOKIE_DOMAINS`, `NEXTAUTH_URL` (if the auth host moves), `PUBLIC_API_ORIGIN`.
6. RS Link and RuneSync: the manifest base URL must be the final one **before** the first Jagex submission.

### A5. Move runbook (when Drake is ready)

1. Deploy the host-map code with nothing set (no change).
2. Add DNS + Railway domains for the new hosts; check each answers over HTTPS.
3. Set `SITE_HOSTS` with the new hosts and `SITE_HOST_ALIASES` with the old ones; deploy. Old page URLs now redirect; old API keeps serving.
4. Set `AUTH_COOKIE_DOMAINS` with both apexes; add the auth host redirect in Discord; test sign-in from each apex.
5. Bot: set the site URL config to the new canonical hosts so DMs and embeds link there.
6. Keep the old hosts as aliases for at least a year (the API alias for as long as a plugin version uses it).

---

## Part B: clan website builder (T-064)

### B1. In one paragraph

A clan that uses JonnyBot can switch on a website at `<slug>.<platform domain>`, pick one of three templates, set its colours, logo and banner, choose which pages to show, and write its own text blocks, all from a new **Website** section of the dashboard with a live preview. Pages fill themselves from the bot's data (roster, stats, events, recaps) under the same privacy rules as the Younglings site. It is one app (the same Next app as the hub), routed by host, cached, so a hundred clan sites cost about the same as one.

### B2. Answers to the ticket's questions

| Question | Default |
|---|---|
| Free vs paid / leased | **Free during the beta**; whether it is paid later is Drake's money decision (PREMIUM-PLAN section 6) |
| Subdomains vs custom domains | **Subdomains first** (`<slug>.<platform>`, slug = the clan profile slug). Custom domains later (T-068), parked behind Drake's infra choice (Railway custom domains per service vs Cloudflare for SaaS) and possibly premium |
| How many templates | **Three**: Classic (the Younglings site's look), Hall (dark, RuneScape stone), Minimal (light, text first) |
| How much a clan can edit | Theme tokens (primary/accent colour from a checked palette, logo, banner, one of three fonts), page on/off and order, text blocks (Markdown subset: headings, bold, italic, links, lists; no HTML), images through the existing upload limits, an "About" page and up to 3 custom text pages. No custom code or CSS |
| Moderation / takedown | Report link in every site footer -> owner Super admin (same queue as clan and event reports) -> unpublish with a reason shown on the clan's dashboard. Content rules on the publish screen. Owner can bar a server |
| Cost control | No per-clan deploy. Pages are server-rendered with caching per tenant (revalidate 5 minutes) and purged by the bot's push invalidation (T-075). Images resized once. Unpublished or unknown tenants get one cached "not found" page |
| Data ownership / export | The clan owns its text, images and settings: "Download my site" exports JSON + images as a zip. Turning the site off keeps the settings 30 days, then deletes them. Bot data shown on the site stays the bot's (and members' privacy choices apply) |
| Shared code with the hub | Yes: same app, a new face `site` in `classifyHost` via `SITE_TENANT_SUFFIX` |
| Younglings site | Stays its own code on `rsyounglings.com` for now. Becoming tenant #1 is a later, separate migration once Classic matches it |
| Privacy | Same rule as the clan site: no individual figures for members who have not opted in; RSNs only, never Discord ids |

### B3. Pages (fixed set, each can be switched off)

Home (banner, intro block, next events, latest recap) · Roster (ranks, RSNs; join dates if the clan shows them) · Stats (clan totals, leaderboards from opted-in members) · Events (the clan's events: public ones from the event engine and Discord scheduled events it shares) · Recaps (weekly Citadel / activity recaps already made by the bot) · Apply (the clan profile's apply link or a web form from T-038) · About + up to 3 custom pages.

### B4. Data model (bot)

- `clan_site (guild_id PK, enabled, published, template, theme JSON, pages JSON, updated_by, updated_at, published_at, takedown_reason NULL)`.
- `clan_site_block (guild_id, page, position, kind TEXT|IMAGE|LINKS, body JSON)`.
- Read route for the website by tenant slug (cached), admin routes for the dashboard, owner routes for takedown. Slug comes from the clan profile (unique already).

### B5. Dashboard (website first)

New nav entry **Clan website** (RuneScape clan group, already proposed in DASHBOARD-NAV; `clanOnly`, Advanced until the builder leaves beta): switch on, template picker with previews, theme, pages (on/off, order), blocks editor, live preview (iframe of the tenant page with a draft token), Publish / Unpublish, Download my site, takedown notice. No Discord commands (a website job); `/clan site` showing the link is optional and not in v1.

### B6. Custom domains (later, T-068)

Clan adds a domain; we show a TXT record to prove ownership and a CNAME target; once verified and TLS is issued by the host, the domain is an alias of the tenant; sign-in uses the handoff from A3. Needs Drake's infra choice first.

### B7. Flags

`SITE_TENANT_SUFFIX` empty = no tenant routing at all. Dashboard section hidden unless `CLAN_SITES=true` (default off). Builder is beta-gated like the hub (`HUB_PUBLIC`-style gate, beta servers only).

---

## Decisions made for Drake

| # | Choice | Default |
|---|---|---|
| W1 | Host config | One host map (`SITE_HOSTS`) + aliases + tenant suffix; unset = today |
| W2 | Old hosts after a move | Pages 308-redirect; API keeps serving (plugins can't follow redirects) |
| W3 | Two apexes sign-in | One auth host + one-time handoff code |
| W4 | What goes on the neutral domain | Hub (apex), events, API, RS Link, JonnyBot face, hosted clan sites; Younglings clan site stays on rsyounglings.com |
| W5 | Reserved slugs | List in A2 |
| W6 | Builder price | Free in beta; paid is Drake's call |
| W7 | Subdomains first, custom domains later | Yes |
| W8 | Templates | Three: Classic, Hall, Minimal |
| W9 | Editing freedom | Tokens, pages, Markdown blocks, images; no HTML/CSS/code |
| W10 | Moderation | Footer report -> owner unpublish; bar a server |
| W11 | Export / deletion | Zip export; settings kept 30 days after switching off |
| W12 | Younglings site as tenant #1 | Later, separate migration |
| W13 | Flags | `SITE_TENANT_SUFFIX` empty and `CLAN_SITES` off by default; beta-gated |

## Build tickets

| Ticket | What | Depends on |
|---|---|---|
| T-226 | Website: host map, aliases (API never redirects), tenant suffix, reserved slugs, links follow the map | none |
| T-227 | Website: per-apex cookies + auth host + one-time handoff | T-226 |
| T-228 | Bot + website: every public URL from config (bot site URLs, User-Agent contact, docs page API address, whoami) | none |
| T-065 | Builder: tenant routing (existing ticket, now follows B2/B7) | T-226 |
| T-066 | Builder: templates and page system (existing) | T-065 |
| T-067 | Builder: dashboard Website section incl. export and takedown notice (existing) | T-066 |
| T-068 | Builder: custom domains (existing; needs Drake's infra choice) | T-065, T-227 |
