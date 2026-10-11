import { gateJonnyBot } from "@/components/jonnybot/gate";
import type { Metadata } from "next";
import { Page, Section } from "@/components/jonnybot/Prose";

export const metadata: Metadata = { title: "API and plugin", description: "JonnyBot's public API and how the clan plugin reports to it." };

const EXAMPLE = `{
  "schema": 1,
  "client": { "name": "jonnybot-plugin", "version": "0.1.0" },
  "player": { "rsn": "Jonny Young" },
  "events": [
    {
      "id": "7f3c2a9e4b1d4c0a9f0e",
      "type": "DROP",
      "at": "2026-10-11T12:00:00Z",
      "source": { "kind": "NPC", "name": "Telos, the Warden" },
      "data": { "itemName": "Crystal Telos armour piece", "quantity": 1 }
    }
  ]
}`;

const READ: [string, string][] = [
  ["GET /v1/clans", "Publicly listed clans. Filter with q, recruiting and focus."],
  ["GET /v1/clans/{slug}", "One clan's public profile."],
  ["GET /v1/clans/{slug}/events", "The events that clan shares publicly."],
  ["GET /v1/events", "Upcoming shared events from every listed clan."],
  ["GET /v1/leaderboards?period=week|month", "Clans that opted in, ranked by XP gained."],
  ["POST /v1/clans/{slug}/report", "Report a listing that breaks the rules."],
];

export default async function ApiDocsPage() {
  const gated = await gateJonnyBot();
  if (gated) return gated;

  return (
    <Page title="API and plugin" intro="What JonnyBot shares, what the in-game clan plugin can send, and the choices players keep." wide>
      <Section id="plugin" title="The clan plugin">
        <p>
          The plugin is an optional extra for players. It can send what happens in the game (drops, boss kills, levels and achievements, whether you are online) to your clan&apos;s
          Discord and website. Nobody is locked out without it: clans keep working exactly as they do now for members who don&apos;t use it.
        </p>
        <ul>
          <li>
            <strong>You choose what is reported.</strong> Every category is off until you switch it on in the <strong>Plugin</strong> tab of your profile. Anything left off is thrown away, even if the plugin
            sends it.
          </li>
          <li>
            <strong>It only reports for names that are yours.</strong> A RuneScape name has to be linked to your Discord account with /rs, and the plugin uses a token only you can make.
          </li>
          <li>
            <strong>You can stop or delete at any time.</strong> Revoke the token to stop it. &ldquo;Delete everything the plugin sent&rdquo; removes every reported event, your tokens and your choices.
          </li>
          <li>Reported events are deleted automatically after 180 days. A clan sees only how many of its members use the plugin, never who.</li>
        </ul>
      </Section>

      <Section id="public" title="Public read API">
        <p>
          Everything a clan chose to share, readable by anyone, from any website. Answers look like <code>{"{ \"apiVersion\": 1, \"data\": ... }"}</code> and can be cached for 30 seconds. It never
          includes a member&apos;s name or Discord details.
        </p>
        <p>
          Base address: <code>https://api.rsyounglings.com</code>. The same routes also answer under <code>/api</code> on the website (for example <code>/api/v1/clans</code>), and the plugin check
          (<code>whoami</code>) tells the plugin the current API address, so it can follow if the API ever moves.
        </p>
        <div className="overflow-x-auto rounded-xl border border-surface-border">
          <table className="w-full text-left text-sm">
            <tbody>
              {READ.map(([route, text]) => (
                <tr key={route} className="border-t border-surface-border first:border-t-0 align-top">
                  <td className="p-3 font-mono text-gold">{route}</td>
                  <td className="p-3">{text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section id="ingest" title="Plugin API (for plugin developers)">
        <p>
          Send the token as <code>Authorization: Bearer jbp_...</code>. <code>GET /ingest/v1/whoami</code> checks a token and lists the names and categories it may use.{" "}
          <code>POST /ingest/v1/events</code> takes a batch of up to 100 events (256 KB). Each event has an <code>id</code> that works as an idempotency key, so a failed request can simply be
          sent again: a repeat is counted as a duplicate, not an error. A bad event is rejected on its own with a reason and the rest still go through.
        </p>
        <pre className="overflow-x-auto rounded-xl border border-surface-border bg-surface p-4 text-xs leading-relaxed">{EXAMPLE}</pre>
        <p>
          Event types: <code>DROP</code>, <code>KILL</code>, <code>LEVEL_UP</code>, <code>QUEST_COMPLETE</code>, <code>ACHIEVEMENT</code>, <code>COLLECTION_LOG</code>, <code>PRESENCE</code>. A drop can carry a{" "}
          <code>source</code> (NPC, activity, chest, player), so a qualifying drop can be told from another way of getting the item. The full contract is the{" "}
          <a href="/openapi/jonnybot-v1.yaml">OpenAPI file</a>.
        </p>
        <p>
          No game needed to try it: the <code>tools/plugin_simulator.py</code> script in the JonnyBot repository posts realistic batches, can send the same batch twice to show duplicates are ignored, and
          has a dry-run mode that prints the batch instead of sending it.
        </p>
      </Section>
    </Page>
  );
}
