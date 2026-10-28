# Dashboard sidebar grouping (R44)

Ticket T-005. Status: **proposal with defaults** (Drake away, 2026-10-20). The build is ticket T-214 and changes `src/components/dashboard/shell/nav.ts` only. Rules for page contents stay in `docs/DASHBOARD-DESIGN.md`.

## 1. What is wrong today

The sidebar groups pages by **what kind of feature** they are (Setup, Members, Features, Community, Moderation, Messages, Clan, Server). Admins come to the dashboard with a **job** in mind ("new people are joining", "post something", "run an event"), and the current groups split those jobs up:

- "Features" and "Community" mean nothing on their own; Tickets sits in Features, Suggestions in Community.
- Events are in three places: Event manager (Community), Event announcer (Messages), Public events (Clan).
- Roles are in three places: Roles & permissions (Setup), Autoroles and Role panels (Members), and the merge train adds Self roles, Kept roles, Role rules and Role toolkit.
- "Announcements" in Members is really "post a message + ban announcements"; "Post a message" is in Messages.
- RuneScape pages are split between Features (Activity announcements, RuneScape timers) and Clan.
- With the pages landing from the merge train (about 70 entries) several groups pass 10 items in the Advanced view.

Favourites (stars) and the search stay the fast path; the grouping is for finding a page the first time.

## 2. Rules for the new grouping

1. Groups are named for the **job**, in plain words, 1-3 words.
2. A page lives in exactly one group, the one an admin would look in first.
3. In the **Basic** view no group shows more than 7 pages; in **Advanced** no more than 10.
4. Order groups by how often a typical server opens them: setup first, health last.
5. The Basic/Advanced split stays exactly as it works today (`advanced: true`, the global slider, active and starred pages always shown, search finds everything).
6. `clanOnly` and `ownerOnly` stay on the items they are on.
7. A new page picks its group from the table in section 3 by job; if none fits, it goes to the closest and the PR says so.

## 3. Proposed groups

`(A)` = Advanced only (unchanged flag unless marked **new**). `(clan)` = clan servers only. Pages marked *merge train* are in open PRs; they are placed here so the build ticket only has to move them.

| Group | Pages, in order |
|---|---|
| *(no title)* | Overview |
| **Get started** | Guided setup · Server setup · Roles & permissions · Commands · Bot appearance · Checkup · Language (A) |
| **New members & roles** | Welcome message · Goodbye message · Autoroles · Self roles *(merge train)* · Role panels · New accounts (A) · Kept roles (A, merge train) · Role rules (A, merge train) · Role toolkit (A, merge train) |
| **Keep it safe** | Automod · Warnings · Lockdown · Moderation log · Auto-clean (A) · Auto-delete (A) · Message & voice logs (A) |
| **Posts & feeds** | Post a message (was "Announcements" + "Post a message", see 4.2) · Server reminders · Feeds · Twitch alerts *(merge train)* · Scheduled posts (A) · Automatic replies (A) · Custom tags (A, merge train) |
| **Community** | Polls & signups · Giveaways · Suggestions · Starboard · Points · Tickets · Web forms *(merge train)* · Chat levels (A, merge train) · Highlights (A) · Temp voice (A) · Voice text (A) |
| **Events** | Event manager · Event announcer (A) · Citadel wheel (A) · Discord events (A, clan; was "Public events") |
| **RuneScape clan** | Clan profile (clan) · Roster (clan) · Needs attention (clan, merge train) · Promotions (clan, merge train) · Clan anniversaries (A, clan, T-194) · Clan points & ranks (clan, merge train) · Clan activity feed (was "Activity announcements") · RuneScape timers · PvM Help (A, merge train) · Alliances (A, clan) · Clan plugin (A, clan) · Clan website (A, clan, merge train) · Fix clan roles (A, clan, merge train) |
| **Logs & tools** | Activity log (A) · Staff digest (A, T-193) · Snapshots (A, owner) |

Counts (Basic / Advanced, clan server, everything merged): Get started 6/7 · New members & roles 5/9 · Keep it safe 4/7 · Posts & feeds 4/7 · Community 7/11 · Events 1/4 · RuneScape clan 6/12 · Logs & tools 0/2.

Two groups pass 10 in Advanced. Default answer: **allow it** for Community (11) and RuneScape clan (12) rather than invent thin groups; rule 3 becomes "no more than 12 in Advanced". If Drake prefers, the split is: Community -> "Community" + "Support" (Tickets, Web forms, Suggestions); RuneScape clan -> "Clan" + "RuneScape" (timers, PvM help, activity feed).

## 4. Label changes

| Today | New | Why |
|---|---|---|
| Announcements | merged into **Post a message** (T-215) (ban announcements move into a "Ban announcements" card on the Post a message page) | Two pages did the same job |
| Public events | **Discord events** | It lists the server's Discord scheduled events for the directory; "public events" sounded like the event manager |
| Activity announcements | **Clan activity feed** | It is the RuneMetrics drops/levels/kills feed for the clan |
| Server setup, everything else | unchanged | |

### 4.1 Redirects

Paths do not change, so no redirects are needed; only labels and groups move. The merged Announcements page keeps its path and shows a one-line "This moved to Post a message" link for a release, then the nav entry goes.

### 4.2 The Announcements merge

The page today has a "post a message" form and a ban-announcement setting. Default: a separate small ticket (T-215) moves the ban-announcement card onto `/post` and redirects `/announcements` to `/post`. T-214 (nav only) keeps an "Announcements" entry in Posts & feeds until T-215 lands, then T-215 removes it.

## 5. Not changing

- Favourites, search (QuickJump), the Overview quick links, the Basic/Advanced slider.
- Which pages are Advanced (the list from website #94) except none; Drake can flip any flag later.
- Collapsible groups: not added (with at most 7 Basic items per group the sidebar fits a laptop screen). Parked idea: collapse state remembered per browser.

## 6. Decisions made for Drake

| # | Choice | Default |
|---|---|---|
| N1 | Group by job instead of feature type | Yes, the 8 groups above |
| N2 | Group names | Get started · New members & roles · Keep it safe · Posts & feeds · Community · Events · RuneScape clan · Logs & tools |
| N3 | Checkup moves to Get started | Yes (it is a setup check) |
| N4 | Allow up to 12 pages in a group in the Advanced view | Yes, no thin extra groups |
| N5 | Merge Announcements into Post a message | Yes, optional for the worker if it grows |
| N6 | Rename Public events to Discord events, Activity announcements to Clan activity feed | Yes |
| N7 | Collapsible groups | Not now |
| N8 | Advanced flags | Unchanged |
