"use client";

import { removePremiumGuildAction, savePremiumGuildAction } from "@/app/admin/(console)/actions";
import type { PremiumGuilds } from "@/lib/jonnybot-admin";
import { GuildListForm } from "./GuildListForm";

/** The servers on the faster polling plan. Only the bot's owner sees or changes the list. */
export function PremiumPlanForm({ initial }: { initial: PremiumGuilds }) {
  return (
    <GuildListForm
      initial={initial}
      save={savePremiumGuildAction}
      remove={removePremiumGuildAction}
      copy={{
        title: "Premium servers",
        hint: "A server here has its clan's players refreshed more often than a standard server's, and ahead of them in the queue. JonnyBot has to be in the server, and the server needs a clan set up, for it to matter.",
        empty: "No premium servers yet. Every server is polled on the standard plan.",
        readOnly: "Only JonnyBot's owner can see or change the premium plan.",
        notPresent: "JonnyBot is not in this server, so the plan has no effect yet",
      }}
    />
  );
}
