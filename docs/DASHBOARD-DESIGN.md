# Dashboard design rules

Written 2026-10-18 after the first hands-on test of the event manager. The Overview page is the model: calm, grouped, each thing in its own panel. Every settings page should read like it.

## Levels of heading (so nothing looks like its neighbour)

| Level | What | Look | Where it comes from |
|---|---|---|---|
| 1 | Page | 2xl, semibold, white | `PageHeader` |
| 2 | Panel | lg, semibold, gold, a line under it | `Card` (or `CollapsibleCard` when it can fold) |
| 3 | A thing you can switch on, and its options | sm, semibold, white, with its switch | `SettingRow` |
| 4 | A control's label | xs, semibold, small capitals, muted | `FormField` |

A control's options sit *under* the thing they belong to, set in behind a rule (`SettingRow` does that), and one thing is separated from the next by a gap. If two things on a page look alike, give one a different level.

## Control widths

A control is only as wide as what goes in it. `FormField` takes `size`:

- `sm` (10rem): numbers, short codes. Default for a number input.
- `md` (20rem): names, dates, drop-downs. Default for a text input or select.
- `lg` (36rem): descriptions, long text, pickers with lists. Default for a text area and anything custom.
- `full`: only for a control that really fills its space (a table, an editor).

Do not stretch a control to fill a panel. Lay panels out so what is in them is a sensible length.

## Use the width: side by side, not one long panel

Controls are narrow now, so a panel stretched across the page is mostly blank. Lay things out by what fits (`components/dashboard/ui/Layout.tsx`); none of it needs a breakpoint, each grid works its columns out from the width it is given, so it holds on a wide screen, beside the sidebar and on a phone.

- `PanelGrid`: panels (cards, boxes) side by side, as many columns as fit (`min`, default 26rem), each only as tall as its own content. One panel alone fills the row. For panels holding a few small controls use `max="max-content"` and cap each panel with `max-w-xl`, so columns sit next to each other instead of far apart.
- `FieldGrid`: a form's fields in 20rem columns, as many as fit. A long field (text area, list, picture picker) goes in `Span` and takes its own row. Never use a fixed `md:grid-cols-2` for fields: it leaves a gap whenever the controls are narrower than the column.
- `Span`: take the whole row of either grid. `SubPanel`: a titled box inside a panel.
- Put a short panel beside a long one (the checklist beside the small panels, the channels beside what they make), not under it.
- One rule (border) above a group of side-by-side sections, never one rule per column: per-column rules leave a gap in the line.
- Keep a long field out of a `FieldGrid`. `Span` only takes as many 20rem columns as fit, so on a narrow panel a text area inside one is 20rem wide; put it under the grid as a plain `FormField size="lg"`.
- A grid of cards where one card may be alone (the buttons of a role panel) gets `min` and `max` the same (`min="18rem" max="18rem"`), or a lone card stretches across the panel. A definite `max` is also what decides how many columns fit.
- A control with a width class (`w-20`) inside `inputClass` (which is `w-full`) is not narrower: wrap it in a box of that width instead.
- A page is an overview first. Anything that is used once in a while (starting a new event, saving a template) is a button that opens a folded panel (`CollapsibleCard` with `open` / `onOpenChange`), not a form that sits on the page all the time.

## Fewer controls

Before adding a drop-down plus a text box, ask whether a switch plus one field says it: "JonnyBot makes it" on (default) shows the name; off, the same place shows a picker.

Two big choice cards that are really on and off are one switch ("Only one role at a time" instead of an "Any number" card beside an "Only one" card). An option that only matters while a switch is on is a child of that `SettingRow` (the channel of the goodbye message, a copy of the welcome by DM); one that matters whether or not it is on (the welcome's channel, which a test message needs) sits outside it.

## Basic and advanced

One setting for the whole dashboard, not one per page: the Basic / Advanced slider under the server icon at the top of the sidebar (`ViewModeSlider`). Basic is the default and shows the few controls most servers need; Advanced adds the ones that are rarely changed. The choice is remembered in this browser and applies to every page at once.

- A page never carries its own switch. It reads the view with `useViewMode()` (no id), or wraps a block in `<Advanced>`.
- When Basic hides something, say so with `<MoreInAdvanced>what is there</MoreInAdvanced>`: a quiet line with a button that switches to Advanced.
- Decide per option: if most servers never touch it, it is Advanced. Hide what doesn't apply at all; if it is kept visible, dim it and say why.
- **A saved value never goes out of sight.** An option that is Advanced-only still shows in Basic once it has been saved with something in it (a custom delay, a footer, a rename-alert channel). Test against the last *saved* state, not the draft, so a field doesn't vanish while it is being cleared. Where the draft holds something Basic hides (it was typed in Advanced), name it in the `<MoreInAdvanced>` line: "Also in use: footer."
- **Never hide what a server needs to get the feature working at all** (the channel of a feature, its on switch, the one role it hands out). Advanced is for what is rarely changed, technical, or only needed by a few servers.
- A page with nothing advanced (the goodbye message) has no `<MoreInAdvanced>` line either.

## Folding

A page of settings is a list of `CollapsibleCard`s with a one-line summary each, so it reads like a checklist and opens only what needs changing.

## Checking a change

Signed-in pages need a Discord login, so a new building block is looked at in the git-excluded preview harness (`/dev-preview?v=...`, see `src/app/dev-preview`) and the page itself is reviewed from screenshots.
