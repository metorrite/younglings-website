"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { TrackingEditor } from "@/components/admin/AdminExtras";
import { WelcomeEditor } from "@/components/admin/WelcomeEditor";
import { Card, ghostButton, primaryButton } from "@/components/admin/ui";
import { HubEditor } from "@/components/dashboard/HubEditor";
import { PermissionGroupsEditor } from "@/components/dashboard/PermissionGroupsEditor";
import { ServerSetupForm } from "@/components/dashboard/ServerSetupForm";
import { choicesOf } from "@/lib/jonnybot-admin";
import { setupChecklist } from "@/lib/setupChecklist";
import { QuickClan, QuickCommands, QuickPermissions, QuickTracking, QuickWelcome, type QuickStepProps } from "./QuickSteps";
import type { FullActions, QuickActions, WizardData } from "./types";

type FeatureId = "permissions" | "clan" | "tracking" | "welcome" | "commands";
type Depth = "quick" | "full";
type Path = Depth | "custom";

interface Feature {
  id: FeatureId;
  title: string;
  blurb: string;
  quick: (props: QuickStepProps) => ReactNode;
}

const FEATURES: Feature[] = [
  { id: "permissions", title: "Admins & staff", blurb: "Who runs JonnyBot in your server. The one thing it can't do without.", quick: (p) => <QuickPermissions {...p} /> },
  { id: "clan", title: "Clan & link requests", blurb: "Track a RuneScape clan, and let members link their names with staff approval.", quick: (p) => <QuickClan {...p} /> },
  { id: "tracking", title: "Clan activity feeds", blurb: "Announce your clan's adventure log activity: drops, quests, boss kills and Citadel visits, plus members joining and leaving.", quick: (p) => <QuickTracking {...p} /> },
  { id: "welcome", title: "Welcome message", blurb: "Greet each new member in a channel.", quick: (p) => <QuickWelcome {...p} /> },
  { id: "commands", title: "Commands", blurb: "Signups, polls, recap cards and the combat achievement lookup.", quick: (p) => <QuickCommands {...p} /> },
];

const PATHS: { id: Path; title: string; time: string; blurb: string }[] = [
  { id: "quick", title: "Quick setup", time: "About 3 minutes", blurb: "Easy yes or no questions, and just the details each part needs: a channel, a clan name, the admin roles." },
  { id: "full", title: "Full setup", time: "About 10 minutes", blurb: "Every part of the setup with all its options: each role and channel, your own permission groups, embeds, and per-command rules." },
  { id: "custom", title: "Custom setup", time: "You choose", blurb: "Tick the parts you want to set up now, then go through just those, quickly or in depth." },
];

/**
 * Walks a server's owner through installing JonnyBot: quick (yes/no questions and the required details), full (every option) or custom
 * (pick the parts first). Every step saves as it goes and starts from the server's current settings, so it can be left and picked up
 * again, run a second time, or used to change one part. A step can always be skipped.
 */
export function SetupWizard({ guildId, guildName, data, quick, full, initialPath = null }: { guildId: string; guildName: string; data: WizardData; quick: QuickActions; full: FullActions; initialPath?: Path | null }) {
  const router = useRouter();
  const [path, setPath] = useState<Path | null>(initialPath);
  const [depth, setDepth] = useState<Depth>("quick");
  const [picked, setPicked] = useState<Set<FeatureId>>(new Set(["permissions", "clan"]));
  // Quick and full have nothing to choose first; custom starts on its pick-the-parts screen.
  const [started, setStarted] = useState(initialPath === "quick" || initialPath === "full");
  const [index, setIndex] = useState(0);
  const [finished, setFinished] = useState(false);

  const steps = path === "custom" ? FEATURES.filter((f) => picked.has(f.id)) : FEATURES;
  const stepDepth: Depth = path === "custom" ? depth : (path ?? "quick");
  const step = steps[index];

  function go(next: number) {
    // later steps start from what the earlier ones just saved
    router.refresh();
    if (next >= steps.length) setFinished(true);
    else setIndex(Math.max(0, next));
  }

  function restart() {
    setPath(null);
    setStarted(false);
    setFinished(false);
    setIndex(0);
  }

  // ---------- finished ----------
  if (finished) {
    const checklist = setupChecklist({ setup: data.setup, permissions: data.permissions, tracking: data.tracking, welcome: data.welcome });
    return (
      <div className="space-y-6">
        <Card title="That's the setup done" hint={`Here is where ${guildName} stands now. Anything left can be done from its own page, or by running this again.`}>
          <ul className="space-y-3">
            {checklist.map((item) => (
              <li key={item.id} className="flex items-start gap-3 text-sm">
                <span aria-hidden="true" className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${item.done ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-muted"}`}>
                  {item.done ? "✓" : "○"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{item.label}</span>
                  <span className="block text-xs text-muted">{item.detail}</span>
                </span>
                {!item.done && (
                  <Link href={`/dashboard/${guildId}/${item.page}`} className={ghostButton}>
                    Set up
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Worth doing next">
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted">
            <li>
              Run <code className="rounded bg-white/10 px-1">/rs</code> in your server to link your own RuneScape name. Your name is also what proves you run your clan.
            </li>
            <li>Move JonnyBot&apos;s role above the roles it should hand out, in Server Settings, Roles.</li>
            <li>
              Look over each command on the <Link className="text-gold underline" href={`/dashboard/${guildId}/commands`}>Commands</Link> page to decide who can use it and where.
            </li>
          </ul>
        </Card>
        <div className="flex flex-wrap gap-3">
          <Link href={`/dashboard/${guildId}`} className={primaryButton}>
            Back to the overview
          </Link>
          <button type="button" className={ghostButton} onClick={restart}>
            Run setup again
          </button>
        </div>
      </div>
    );
  }

  // ---------- choosing a path ----------
  if (!path) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">Choose how you want to set up JonnyBot in {guildName}. You can skip any step, stop whenever you like, and come back: it picks up from what&apos;s already set.</p>
        <div className="grid gap-4 md:grid-cols-3">
          {PATHS.map((p) => (
            <button key={p.id} type="button" onClick={() => { setPath(p.id); setStarted(p.id !== "custom"); setIndex(0); }} className="rounded-lg border border-surface-border bg-surface p-5 text-left transition hover:border-gold">
              <span className="block font-semibold text-gold">{p.title}</span>
              <span className="mt-0.5 block text-xs text-muted">{p.time}</span>
              <span className="mt-3 block text-sm">{p.blurb}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---------- custom: choose the parts first ----------
  if (path === "custom" && !started) {
    return (
      <div className="space-y-6">
        <Card title="What do you want to set up?" hint="Tick the parts you want to go through. Each one is a short run of questions.">
          <div className="space-y-3">
            {FEATURES.map((feature) => (
              <label key={feature.id} className="flex items-start gap-3 rounded-md border border-surface-border bg-background/40 p-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={picked.has(feature.id)}
                  onChange={(e) => {
                    const next = new Set(picked);
                    if (e.target.checked) next.add(feature.id);
                    else next.delete(feature.id);
                    setPicked(next);
                  }}
                />
                <span>
                  <span className="font-medium">{feature.title}</span>
                  <span className="block text-xs text-muted">{feature.blurb}</span>
                </span>
              </label>
            ))}
          </div>
          <fieldset className="space-y-2 border-t border-surface-border pt-4">
            <legend className="text-sm font-medium">How detailed?</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="depth" checked={depth === "quick"} onChange={() => setDepth("quick")} /> Quick: the essentials of each part
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="depth" checked={depth === "full"} onChange={() => setDepth("full")} /> Full: every option of each part
            </label>
          </fieldset>
        </Card>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={primaryButton} disabled={picked.size === 0} onClick={() => { setStarted(true); setIndex(0); }}>
            Start with {picked.size} part{picked.size === 1 ? "" : "s"}
          </button>
          <button type="button" className={ghostButton} onClick={restart}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // ---------- a step ----------
  const quickProps: QuickStepProps = { data, actions: quick, onSaved: () => go(index + 1) };
  const fullBody: Record<FeatureId, ReactNode> = {
    permissions: <PermissionGroupsEditor initial={data.permissions} roles={data.structure.roles} canEdit={data.isAdmin} save={full.permissions} />,
    clan: <ServerSetupForm initial={data.setup} structure={data.structure} save={full.setup} />,
    tracking: <TrackingEditor groups={data.tracking} {...choicesOf(data.structure)} save={full.tracking} />,
    welcome: <WelcomeEditor initial={data.welcome} {...choicesOf(data.structure)} actions={{ save: full.welcome, test: full.welcomeTest }} />,
    commands: <HubEditor hub={data.hub} structure={data.structure} canEditAccess={data.isAdmin} save={full.hub} />,
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted">
          Step {index + 1} of {steps.length} · {path === "custom" ? `Custom, ${stepDepth}` : `${stepDepth === "quick" ? "Quick" : "Full"} setup`}
        </p>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={index}>
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(index / steps.length) * 100}%` }} />
        </div>
        <h2 className="text-xl font-semibold">{step.title}</h2>
        <p className="text-sm text-muted">{step.blurb}</p>
      </div>

      <div key={`${step.id}-${stepDepth}`}>{stepDepth === "quick" ? step.quick(quickProps) : fullBody[step.id]}</div>

      <div className="flex flex-wrap items-center gap-3 border-t border-surface-border pt-4">
        <button type="button" className={ghostButton} onClick={() => (index === 0 ? restart() : go(index - 1))}>
          Back
        </button>
        {stepDepth === "full" ? (
          <button type="button" className={primaryButton} onClick={() => go(index + 1)}>
            {index + 1 === steps.length ? "Finish" : "Next step"}
          </button>
        ) : step.id === "permissions" && data.isAdmin ? (
          // the admin roles are the one thing JonnyBot can't work without, so this step can't be skipped
          <span className="text-xs text-muted">This step can&apos;t be skipped: JonnyBot needs at least one admin role.</span>
        ) : (
          <button type="button" className={ghostButton} onClick={() => go(index + 1)}>
            Skip this step
          </button>
        )}
        {stepDepth === "full" && <span className="text-xs text-muted">Save the part above before moving on: Next doesn&apos;t save it for you.</span>}
      </div>
    </div>
  );
}
