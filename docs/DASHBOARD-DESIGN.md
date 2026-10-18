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

## Fewer controls

Before adding a drop-down plus a text box, ask whether a switch plus one field says it: "JonnyBot makes it" on (default) shows the name; off, the same place shows a picker.

## Basic and advanced

`useViewMode(id)` + `ViewModeSwitch`: panels show the few controls most people need (basic, the default) and everything in advanced. The choice is remembered per browser. Hide what doesn't apply; if it is kept visible, dim it and say why.

## Folding

A page of settings is a list of `CollapsibleCard`s with a one-line summary each, so it reads like a checklist and opens only what needs changing.

## Checking a change

Signed-in pages need a Discord login, so a new building block is looked at in the git-excluded preview harness (`/dev-preview?v=...`, see `src/app/dev-preview`) and the page itself is reviewed from screenshots.
