import { gateJonnyBot } from "@/components/jonnybot/gate";
import type { Metadata } from "next";
import { Page, Section } from "@/components/jonnybot/Prose";
import { supportUrl } from "@/lib/support";

export const metadata: Metadata = { title: "Privacy", description: "What JonnyBot stores, why, and how to have it removed." };

export default async function PrivacyPage() {
  const gated = await gateJonnyBot();
  if (gated) return gated;
  const support = supportUrl();
  return (
    <Page title="Privacy" intro="What JonnyBot and this website keep, why, and how to have it removed. Last updated October 2026.">
      <Section title="What JonnyBot stores">
        <ul>
          <li>
            <strong>Discord:</strong> your Discord user ID (and, for display, your name and avatar as Discord shows them), and the IDs of the servers, roles and channels the bot works with.
          </li>
          <li>
            <strong>RuneScape:</strong> the RuneScape 3 names you link, and the public data for those names that RuneScape publishes (stats, Adventurer&apos;s Log activity, clan membership and rank), saved at each refresh so history and recaps can be shown.
          </li>
          <li>
            <strong>Each server&apos;s settings:</strong> what its admins configure, such as channels, roles, welcome messages and the pictures they upload for them.
          </li>
          <li>
            <strong>Tickets, polls and signups:</strong> what members submit through them, including ticket messages and transcripts, kept for the retention the server chooses.
          </li>
          <li>
            <strong>Admin activity:</strong> a log of changes made from the dashboard (who changed what, and when), kept so a server&apos;s admins can see it.
          </li>
        </ul>
        <p>JonnyBot does not read ordinary messages in your server for any purpose other than the commands, buttons and tickets members use.</p>
      </Section>

      <Section title="What this website stores">
        <p>
          Signing in with Discord shares your Discord user ID, name and avatar with the site (the <code>identify</code> permission only). It is kept in a sign-in cookie for as long as you stay signed in. The site uses no advertising or tracking cookies.
        </p>
      </Section>

      <Section title="Who can see it">
        <ul>
          <li>A server&apos;s admins see their own server&apos;s data on the dashboard. They cannot see another server&apos;s.</li>
          <li>
            A linked RuneScape name and its public stats can appear on a clan&apos;s public pages if that clan has chosen to publish them; a member can opt out of being shown.
          </li>
          <li>The person who runs JonnyBot can access the database in order to run and fix the service. It is not sold or shared with anyone else.</li>
        </ul>
      </Section>

      <Section title="Removing your data">
        <ul>
          <li>
            <strong>Unlink a name:</strong> use <code>/rs</code> and remove the account. That removes the link everywhere.
          </li>
          <li>
            <strong>A server removes JonnyBot:</strong> its settings stop being used and its stored data is deleted automatically 30 days later, unless JonnyBot is added back first. The owner can also ask for it to be deleted sooner.
          </li>
          <li>
            <strong>Anything else:</strong>{" "}
            {support ? (
              <>
                ask in{" "}
                <a href={support} className="text-gold underline-offset-2 hover:underline">
                  JonnyBot&apos;s support server
                </a>
              </>
            ) : (
              "ask in the Younglings Discord server (linked from the clan site)"
            )}{" "}
            and your data will be removed or you will be told why it can&apos;t be.
          </li>
        </ul>
      </Section>

      <Section title="Changes">
        <p>If this changes in a way that matters, the date above changes and the news is posted on the dashboard.</p>
      </Section>
    </Page>
  );
}
