# Dev snapshot button (T-094)

Owner-only tab at the bottom-left of every page of every face (clan site, JonnyBot site, dashboard, hub, /admin). The bot half and zip format are in `JonnyBot/docs/DEV-SNAPSHOT.md`.

- **Who:** the bot's owner only. `DevSnapshotMount` (root layout) asks the bot (`whoami`, `isOwner`) on the server; for anyone else it renders nothing, so no markup and no script is sent. A signed-out visitor costs no bot call. Answers are cached 60 s per user (`devSnapshotGate.ts`); a bot that is down or too old means no button.
- **The lock** is `POST /api/dev/snapshot`, which repeats the owner check and answers 404 to everyone else. It needs a JSON body and the login cookie is SameSite=Lax.
- **What the browser reports:** URL (no query or fragment), route, guild from `/dashboard/<id>`, browser time + timezone, viewport, the last 50 console errors / script errors / failed fetches (a ring buffer installed only by the button; method, path and status only), the site's localStorage keys minus anything credential-shaped. Never cookies, tokens, headers or request bodies. The server cleans and scrubs it again (`siteSnapshot.ts`).
- **Result:** one download `jb-snapshot-<id>.zip` = the bot's zip plus `site/page.json`, `site/client-log.json`, `site/storage.json` (and `siteFiles` in the manifest). "Copy id" and "Copy bug report" put the id and URL on the clipboard for the board's bug form.
- **Preview:** `/dev-preview?v=devbutton`. **Tests:** `node --test tests/devSnapshot.test.mjs`.
