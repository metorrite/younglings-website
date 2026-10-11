"use client";

import { removeBetaGuildAction, saveBetaGuildAction } from "@/app/admin/(console)/actions";
import type { BetaGuilds } from "@/lib/jonnybot-admin";
import { GuildListForm } from "./GuildListForm";

/** The trusted servers whose admins may use JonnyBot's website while it is closed. Read by every admin, changed only by the bot's owner. */
export function BetaAccessForm({ initial }: { initial: BetaGuilds }) {
  return (
    <GuildListForm
      initial={initial}
      save={saveBetaGuildAction}
      remove={removeBetaGuildAction}
      copy={{
        title: "Trusted servers",
        hint: "Anyone who holds Administrator or Manage Server in one of these servers can use JonnyBot's website and dashboard normally while it is still closed to everyone else, just like the clan's own admins. JonnyBot has to be in the server for this to work.",
        empty: "No servers yet. Only the clan's admins can get in.",
        readOnly: "Only JonnyBot's owner can change this list.",
        notPresent: "JonnyBot is not in this server, so nobody gets in through it yet",
      }}
    />
  );
}
