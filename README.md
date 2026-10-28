# Younglings Website

> [!IMPORTANT]
> **This repo is frozen (2026-10-22). Don't open new PRs here.** The site now lives in the RuneClans monorepo as
> [`apps/younglings` in metorrite/runeclans](https://github.com/metorrite/runeclans/tree/dev/apps/younglings), with this repo's full history
> (ticket T-266). Make every change there.
>
> This repo still deploys rsyounglings.com until the Railway service is repointed
> ([steps](https://github.com/metorrite/runeclans/blob/dev/docs/RAILWAY-REPOINT.md)), so it is **not archived** yet. Its `master` is
> what's live; nothing new gets merged here.

The companion website for the Younglings Discord server. v1 is Discord login + a profile page;
"who's online" and "upcoming events" are planned next, pulled live from JonnyBot (the Discord bot
in the sibling `JonnyBot` repo) rather than tracked independently here.

Built with [Next.js](https://nextjs.org) (App Router) + [Tailwind CSS](https://tailwindcss.com) +
[Auth.js (next-auth)](https://next-auth.js.org) for Discord OAuth2 login.

## One-time setup: registering a Discord OAuth application

Login needs a Discord application with OAuth2 configured. You can either add this to JonnyBot's
existing Discord application, or create a separate one just for the website — either works, but a
separate application keeps the bot's token and the website's client secret from being mixed up.

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Create a new application (or open the existing one), name it something like "Younglings
   Website".
3. Under **OAuth2 > General**, copy the **Client ID** and **Client Secret**.
4. Under **OAuth2 > Redirects**, add:
   - `http://localhost:3000/api/auth/callback/discord` (for local development)
   - `https://<your-production-domain>/api/auth/callback/discord` (once deployed)

## Local development

```bash
npm install
cp .env.example .env.local
# then fill in .env.local:
#   DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET from the step above
#   NEXTAUTH_SECRET — generate with: openssl rand -base64 32
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Login with Discord** to test the
OAuth flow end-to-end.

## Deploying

This is set up to deploy the same way as most Next.js apps — as its own Railway service (or
Vercel, if you'd rather). Whichever host you use:

1. Set the same environment variables from `.env.example` in the host's dashboard, with
   `NEXTAUTH_URL` set to the real production URL.
2. Add that production callback URL (`https://<domain>/api/auth/callback/discord`) to the Discord
   application's OAuth2 redirects (step 4 above) — login will fail with a redirect mismatch error
   until this is added.

## Hosts and domains (optional)

One deployment serves several faces, chosen by the host a request was sent to (`src/lib/siteHosts.ts`, `src/proxy.ts`). With none
of these set the site runs on one host, as in local development. Design: `docs/DOMAINS-AND-SITE-BUILDER.md` part A.

**The visitor's address** (rate limits, RS Link's IP rules; T-175) comes from `src/lib/clientIp.ts`:
- Behind Cloudflare's proxy (orange cloud), set `CLIENT_IP_HEADER=CF-Connecting-IP`.
- With DNS only (grey cloud), leave it unset: the site takes the right-most `X-Forwarded-For` entry, which is what Railway's edge saw.
  Visitors can only add entries to the left, so they can't choose their address.
- `TRUSTED_PROXY_HOPS` (default 1) is the number of proxies that append to that header.

| Variable | What it does |
|---|---|
| `JONNYBOT_SUBDOMAIN` | `true` puts JonnyBot's pages and the dashboard on `jonnybot.<apex>` instead of `/jonnybot` (also on when `SITE_HOSTS` names a `jonnybot` host). |
| `SITE_APEX_HOST` | The clan site's own host, e.g. `rsyounglings.com` (falls back to `AUTH_COOKIE_DOMAIN`). Other names under it go to the clan site. |
| `PUBLIC_API_ORIGIN` | The API address told to plugins (whoami, docs). Wins over everything below. |
| `SITE_HOSTS` | Each face's canonical host: `clan=rsyounglings.com,jonnybot=jonnybot.example,hub=example,events=events.example,api=api.example,link=link.example`. A face left out keeps the prefix rule (`jonnybot.`, `api.`, `clans.` on the apex). Cross-face links follow it. |
| `SITE_HOST_ALIASES` | Old hosts of a face: `clans.rsyounglings.com=hub,api.rsyounglings.com=api`. Pages there redirect (308) to the face's `SITE_HOSTS` host; the API there keeps answering and never redirects (plugins can't follow redirects), nor do the site's own `/api` calls. |
| `SITE_TENANT_SUFFIX` | `<slug>.<suffix>` is a hosted clan site (website builder). Empty = off. Reserved slugs (`www`, `api`, `link`, `events`, `clans`, `jonnybot`, `admin`, `auth`, `mail`, `status`, `cdn`, `static`, `assets`, `dev`, `staging`, and the first label of any `SITE_HOSTS` host) are never clan sites. Until the builder is live, these addresses go to the clan site. |
| `CALENDAR_FEEDS` | `true` turns on the subscribable events calendars: `/api/events/calendar.ics` (the clan site's events) and `/api/v1/clans/<slug>/calendar.ics` (a clan's public events), with a "Subscribe in your calendar" link on those events pages. Off by default (the feeds answer 404 and no link shows). |
| `CLAN_SITES` | `true` serves those addresses as clan websites (website builder, beta). Off by default; also needs `SITE_TENANT_SUFFIX`. A site shows only when published and its server is the home server or on the beta list. |
| `AUTH_COOKIE_DOMAINS` | Sign-in across two apexes: `.rsyounglings.com,.example`. The session cookie is set for the apex of the host in use; Discord sign-in still completes on `NEXTAUTH_URL`'s host, and a visitor from the other apex is sent back with a one-time code (60 s, single use, bound to that host). One entry or unset = `AUTH_COOKIE_DOMAIN` as before. The codes are kept in memory, so the site must run as one instance. |

Buying a domain, DNS (Cloudflare), Railway custom domains and the Discord redirect URL are manual steps; see the design doc's runbook (A4, A5).

## Project structure

- `src/lib/auth.ts` — Auth.js configuration (the Discord provider, session shape).
- `src/app/api/auth/[...nextauth]/route.ts` — the OAuth callback route Auth.js needs.
- `src/app/profile/page.tsx` — the v1 profile page; redirects to login if you're not signed in.
- `src/components/Navbar.tsx`, `LoginButton.tsx` — shared layout/login UI.

## What's next

- A small private API added to JonnyBot exposing live online-member and scheduled-event data,
  which this site will call server-side (not exposed to browsers) to fill in the "Who's Online"
  and "Upcoming Events" cards on the home page.
- RS3 hiscores/activity tracking is intentionally not part of this site yet — planned once a
  separate tracking API project is ready.
