import type { Metadata } from "next";
import { FeatureOrbit } from "@/components/jonnybot/FeatureOrbit";
import { installUrl } from "@/lib/dashboard";
import { FEATURES } from "@/lib/jonnybotFeatures";
import { jonnybotHref } from "@/lib/siteHosts";
import { currentSite } from "@/lib/siteHostsServer";

export const metadata: Metadata = {
  title: "JonnyBot: a Discord bot for RuneScape 3 clans",
  description: "Clan activity feeds, linked RuneScape profiles, tickets, polls, signups and a web dashboard, for your RuneScape 3 Discord server.",
};

const STEPS = [
  { title: "Add JonnyBot", text: "Pick your server on Discord and approve the permissions. It starts with nothing switched on." },
  { title: "Run the setup guide", text: "Open the dashboard and answer a few questions: your clan, who the admins are, where updates go." },
  { title: "Let it work", text: "It tracks your clan, announces what happens and keeps roles in step. Change anything later from the dashboard." },
];

export default async function JonnyBotHome() {
  const site = await currentSite();
  const install = installUrl();
  const button = "rounded-md px-5 py-2.5 text-sm font-semibold transition";

  return (
    <div className="pt-12 sm:pt-16">
      <FeatureOrbit>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">JonnyBot</h1>
        <p className="mt-3 text-balance text-lg text-muted">The Discord bot for RuneScape 3 clans and communities.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href={install ?? jonnybotHref(site, "/install")} className={`${button} bg-[#5865F2] text-white hover:bg-[#4752c4]`}>
            Add to Discord
          </a>
          <a href={jonnybotHref(site, "/dashboard")} className={`${button} border border-surface-border hover:border-gold`}>
            Open the dashboard
          </a>
        </div>
      </FeatureOrbit>

      <section className="mx-auto mt-28 max-w-6xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-semibold">Everything a RuneScape clan server needs</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-muted">
          Built by a clan for its own server, then opened up. Switch on what you want; everything else stays out of the way.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <li key={feature.title} className="rounded-xl border border-surface-border bg-surface p-5">
              <p className="flex items-center gap-2 font-semibold">
                <span aria-hidden="true">{feature.icon}</span>
                {feature.title}
              </p>
              <p className="mt-2 text-sm text-muted">{feature.blurb}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto mt-24 max-w-4xl px-4 sm:px-6">
        <h2 className="text-center text-2xl font-semibold">Set up in minutes</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-surface-border bg-surface p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold text-gold">{i + 1}</span>
              <p className="mt-3 font-semibold">{step.title}</p>
              <p className="mt-1 text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-24 max-w-3xl px-4 text-center sm:px-6">
        <h2 className="text-2xl font-semibold">Ready when you are</h2>
        <p className="mt-2 text-muted">Read the docs first, or add it and start with the guided setup.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href={jonnybotHref(site, "/install")} className={`${button} bg-gold text-background hover:brightness-110`}>
            Install JonnyBot
          </a>
          <a href={jonnybotHref(site, "/docs")} className={`${button} border border-surface-border hover:border-gold`}>
            Read the docs
          </a>
        </div>
      </section>
    </div>
  );
}
