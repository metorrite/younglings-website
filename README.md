# Younglings Website

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
