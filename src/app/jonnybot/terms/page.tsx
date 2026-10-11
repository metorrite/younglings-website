import { gateJonnyBot } from "@/components/jonnybot/gate";
import type { Metadata } from "next";
import { Page, Section } from "@/components/jonnybot/Prose";

export const metadata: Metadata = { title: "Terms", description: "The terms for using JonnyBot." };

export default async function TermsPage() {
  const gated = await gateJonnyBot();
  if (gated) return gated;
  return (
    <Page title="Terms" intro="Plain terms for using JonnyBot and its website. Last updated October 2026.">
      <Section title="Using JonnyBot">
        <ul>
          <li>JonnyBot is run by a RuneScape clan as a hobby project. It is provided as it is, with no promise that it will always be available or error-free.</li>
          <li>You may add it to servers you manage and use its features as intended. Don&apos;t use it to harass people, to break Discord&apos;s or Jagex&apos;s rules, or to overload the service.</li>
          <li>Server admins are responsible for how they configure the bot in their server, including the messages it posts and the roles it gives.</li>
        </ul>
      </Section>

      <Section title="Your data">
        <p>What JonnyBot stores and how to have it removed is described on the Privacy page.</p>
      </Section>

      <Section title="Changes and removal">
        <ul>
          <li>Features can change or be removed. If something you rely on is going, the dashboard will say so.</li>
          <li>Access can be withdrawn from a server or a person who misuses the bot or the website.</li>
        </ul>
      </Section>

      <Section title="Not affiliated">
        <p>JonnyBot is not made, endorsed or supported by Jagex or Discord. RuneScape is a trademark of Jagex Ltd.</p>
      </Section>
    </Page>
  );
}
