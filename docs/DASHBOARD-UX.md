# Dashboard usability notes

Written 2026-10-18 during an overnight review of the dashboard, looking at each page the way a person using it would: what do they do first, second and third, is the main action obvious, can they tell what a control is without guessing. These sit beside `DASHBOARD-DESIGN.md` (how things look and are built); this file is why, and what to check.

## Principles, with where they come from

1. **Show the common settings, keep the rest one click away.** Progressive disclosure (Jakob Nielsen, 1995): fewer mistakes for newcomers, no long lists to scan past for experts. The catch is discoverability, so a hidden option is always pointed at (`MoreInAdvanced`), never buried. [Uxcel: split settings into basic and advanced](https://app.uxcel.com/courses/mobile-design/mobile-settings-745/split-settings-into-basic-and-advanced-9005), [Nielsen on progressive disclosure](https://brajeshwar.com/2006/progressive-disclosure-by-jakob-nielsen-usability-expert/).
2. **An overview page is numbers, a next step and what changed, not a list of links.** A handful of core metrics (three to five) is quicker to act on than many. [SaaS dashboard design principles](https://www.saasfactor.co/blogs/saas-dashboard-ui), [Cloudscape: dashboards](https://cloudscape.design/patterns/general/service-dashboard/static-dashboard/).
3. **An empty list explains itself and offers one action.** Say what the page will hold and give a single button to add the first item; never an empty table with column headings. [Cloudscape: empty states](https://cloudscape.design/patterns/general/empty-states/).
4. **Save in sections, and say when something isn't saved.** Group fields, save per section, warn before unsaved changes are lost, and keep Save where it can be reached (`SaveBar`). [Cloudscape patterns](https://cloudscape.design/patterns), [Wix dashboard page guidelines](https://dev.wix.com/docs/build-apps/develop-your-app/frameworks/wix-blocks/dashboard-pages/ux-guidelines-for-dashboard-pages-in-blocks).
5. **Every control has a visible label.** Placeholders vanish once someone types and often fail contrast, so they are examples, not labels. One column of fields reads fastest. [Form design best practices](https://madegooddesigns.com/form-design-best-practices/), [Nielsen Norman Group form guidance, as summarised by UXPin](https://www.uxpin.com/studio/wp-json/wp/v2/posts/57927).
6. **Errors sit next to the field, in plain words, and say how to fix it.** Not by colour alone. [Yukon government forms guide](https://guide.yukon.ca/en/content-and-design/forms/user-experience-ux-standards-forms/how-help-people-recover-form-error).
7. **Make controls easy to see and hit (WCAG 2.2 AA).** Text 4.5:1, the edge of an input or switch 3:1 against what is behind it, a keyboard focus ring you can see, and targets at least 24 by 24 px. Custom switches have to work from the keyboard. [WCAG 2.2 checklist](https://getwcag.com/blog/wcag-2-2-checklist), [on focus visibility](https://www.yatil.net/blog/wcag22-visible-focus).

## What was found and changed

- **Input and switch edges were 1.3:1** against the page (`--surface-border`), so a field was hard to find. Controls now use `--control-border` (3.9:1). Panel edges keep the subtle colour.
- **No consistent keyboard focus ring.** One gold ring for links, buttons, tabs, switches and summaries (`globals.css`); inputs keep their gold border and gain a soft ring.
- **Objectives were numbers with no labels** ("10 1 1" with only a tooltip). The list now has named columns (Points, Needed, Times, How it's proven), a plain-words line on what Needed and Times mean, an empty state with one button, and a save bar that says when changes are unsaved.
- **The event's tabs were in the wrong order and wrapped to three rows on a phone.** They now follow the work (overview, then Board, Objectives, Players, Team builder, Channels, then Progress, Standings, Prizes, Wrap-up), have a divider between set-up and running, stay in view while scrolling, and scroll sideways on a narrow screen.
- **Dimmed tabs were below 4.5:1** and are now clearer.

## How to review a page next time

Open it as someone who has never seen it: what is the first thing they are meant to do, and is that the most obvious thing on the page? Then check that nothing is labelled only by a placeholder or a tooltip, that a long list has an empty state, that a destructive button is not next to the main one without a confirmation, that Tab reaches everything in a sensible order, and that it holds at 375 px with no sideways scroll. `axe-core` (injected from cdnjs into the preview page) catches the mechanical failures; the rest needs eyes.
