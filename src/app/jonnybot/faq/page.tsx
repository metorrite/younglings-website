import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Page } from "@/components/jonnybot/Prose";
import { jonnybotHref } from "@/lib/siteHosts";
import { currentSite } from "@/lib/siteHostsServer";

export const metadata: Metadata = { title: "FAQ", description: "Common questions about JonnyBot." };

export default async function FaqPage() {
  const site = await currentSite();
  const link = "text-gold underline-offset-2 hover:underline";

  const items: { q: string; a: ReactNode }[] = [
    {
      q: "What is JonnyBot?",
      a: "A Discord bot for RuneScape 3 clans and communities, built by the Younglings clan for its own server and opened up for others. It announces clan activity, links members to their RuneScape names, runs tickets, polls and signups, and has a web dashboard to set it all up.",
    },
    { q: "Does it work for Old School RuneScape?", a: "No. It is built on RuneScape 3's public data (the Adventurer's Log and the clan hiscores)." },
    {
      q: "Is it free?",
      a: "Adding and using JonnyBot costs nothing today. If that ever changes, this page will say so.",
    },
    {
      q: "Who can open my server's dashboard?",
      a: "The server's owner, anyone with the Administrator or Manage Server permission, and anyone holding a role you have put in the Admin group. People in the Developer group get a limited view. Access is checked against your server's roles every time, so removing a role takes effect straight away.",
    },
    {
      q: "A member's profile isn't updating. Why?",
      a: "Tracking reads the player's public Adventurer's Log. If their log is private, JonnyBot can link the name but has nothing to read. They can make it public in RuneScape's settings. Profiles are refreshed every few hours, and a member can press Update on their /rs panel for an immediate refresh.",
    },
    {
      q: "Why does JonnyBot want Manage Roles?",
      a: "To give members the right roles when they link a RuneScape name or join the clan. It can only manage roles below its own, so move its role above the ones it should hand out.",
    },
    {
      q: "What does it store about my members?",
      a: (
        <>
          Linked RuneScape names, public RuneScape stats and activity, and your server&apos;s own settings, tickets and signups. The{" "}
          <a className={link} href={jonnybotHref(site, "/privacy")}>
            privacy page
          </a>{" "}
          lists it all.
        </>
      ),
    },
    {
      q: "Can I remove my data?",
      a: "A linked member can unlink their name at any time with /rs, which removes it from every server. A server's admins can remove a link in their own server. To have anything else deleted, ask via the contact on the privacy page.",
    },
    {
      q: "Can it welcome new members with a button?",
      a: "Yes. The welcome message can be an embed, or the newer container layout, where the link-your-RuneScape-name button can sit inside the message, even in the footer.",
    },
    {
      q: "Something is broken or I need help.",
      a: "Join the Younglings Discord (linked from the clan site) and ask there. Include what you clicked and what you expected.",
    },
  ];

  return (
    <Page title="Frequently asked questions">
      <div className="space-y-3">
        {items.map((item) => (
          <details key={item.q} className="group rounded-xl border border-surface-border bg-surface p-5 open:border-gold/40">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
              {item.q}
              <span aria-hidden="true" className="text-muted transition group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 leading-relaxed text-[#cfd3da]">{item.a}</p>
          </details>
        ))}
      </div>
    </Page>
  );
}
