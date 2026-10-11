/** What JonnyBot does, in one place for the landing page's floating cards and its feature grid. Keep true to the bot: nothing here is aspirational. */
export interface Feature {
  title: string;
  blurb: string;
  icon: string;
}

export const FEATURES: Feature[] = [
  { icon: "📜", title: "Clan activity feeds", blurb: "Drops, level-ups, quests, boss kills and Citadel visits announced in the channels you choose." },
  { icon: "🔗", title: "Link your RuneScape name", blurb: "Members link their RS3 names with staff approval, and Member and Guest roles follow the clan roster." },
  { icon: "📈", title: "Profiles and recaps", blurb: "Stats and XP history for every linked player, and weekly, monthly and yearly recap cards." },
  { icon: "🎫", title: "Tickets", blurb: "Ticket panels with your own questions, helper roles, escalation and transcripts." },
  { icon: "🗳️", title: "Polls and signups", blurb: "Polls, plus signup queues, groups and submission forms with a public panel." },
  { icon: "👋", title: "Welcome messages", blurb: "Design a welcome with embeds or the newer container layout, with the link button right inside it." },
  { icon: "🛡️", title: "Permission groups", blurb: "Admin, Support and your own groups of roles decide who can use what, down to each command." },
  { icon: "⚔️", title: "Combat achievements", blurb: "Look up any Combat Mastery achievement: its tier, its scores and the wiki's tips." },
  { icon: "📊", title: "Weekly reports", blurb: "A clan report, a Citadel report and a joins and leaves digest, posted on their own." },
  { icon: "🖥️", title: "A web dashboard", blurb: "Set everything up in your browser, with a guided setup, instead of typing commands." },
];
