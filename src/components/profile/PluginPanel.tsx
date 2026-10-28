"use client";

import { confirmDialog } from "@/components/ui/Dialogs";
import Link from "next/link";
import { useState, useTransition } from "react";
import { createPluginTokenAction, deletePluginDataAction, revokeBotGrantAction, revokePluginTokenAction, savePluginConsentAction } from "@/app/profile/pluginActions";
import type { PluginView } from "@/lib/plugin";
import { shortDate } from "@/lib/site";

const field = "w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-gold disabled:opacity-50";
const primary = "rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-50";
const ghost = "rounded-md border border-surface-border px-3 py-1.5 text-sm text-muted transition hover:text-foreground disabled:opacity-40";
const danger = "rounded-md border border-red-500/40 px-3 py-1.5 text-sm text-red-300 transition hover:bg-red-500/10 disabled:opacity-40";

/** Connect the in-game plugin: choose what it may report, make tokens, and delete what it has sent. Tokens are shown once, when they are made. */
export function PluginPanel({ initial }: { initial: PluginView }) {
  const [view, setView] = useState(initial);
  const [label, setLabel] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();

  const say = (tone: "ok" | "error", text: string) => setNote({ tone, text });

  function toggle(key: string, on: boolean) {
    const next = on ? [...new Set([...view.consented, key])] : view.consented.filter((k) => k !== key);
    setNote(null);
    start(async () => {
      const result = await savePluginConsentAction(next);
      if (!result.ok) return say("error", result.error);
      setView(result.data);
      say("ok", "Saved. The plugin only reports what is switched on.");
    });
  }

  function make() {
    setNote(null);
    setCopied(false);
    start(async () => {
      const result = await createPluginTokenAction(label);
      if (!result.ok) return say("error", result.error);
      setView(result.data.view);
      setFresh(result.data.token);
      setLabel("");
    });
  }

  function revoke(id: string) {
    setNote(null);
    start(async () => {
      const result = await revokePluginTokenAction(id);
      if (!result.ok) return say("error", result.error);
      setView(result.data);
      say("ok", "Token revoked. The plugin using it can no longer report.");
    });
  }

  async function wipe() {
    if (!(await confirmDialog({ title: "Delete everything the plugin has reported about you?", body: "That includes all your plugin tokens and choices. This can't be undone.", confirmLabel: "Delete it all", tone: "danger" }))) return;
    setNote(null);
    setFresh(null);
    start(async () => {
      const result = await deletePluginDataAction();
      if (!result.ok) return say("error", result.error);
      setView(result.data.view);
      say("ok", `Deleted ${result.data.removedEvents} reported ${result.data.removedEvents === 1 ? "event" : "events"}, your tokens and your choices.`);
    });
  }

  function removeGrant(appId: string, name: string) {
    setNote(null);
    start(async () => {
      const result = await revokeBotGrantAction(appId);
      if (!result.ok) return say("error", result.error);
      setView(result.data);
      say("ok", `${name} can no longer see your plugin data.`);
    });
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false); // the token is selectable in the box, so it can still be copied by hand
    }
  }

  const active = view.tokens.filter((t) => !t.revoked);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">
        The JonnyBot clan plugin can send what happens in the game to your clan&apos;s Discord and website. It is optional, it only ever reports what you switch on
        below, and you can stop it or delete everything it sent at any time.{" "}
        <Link href="/jonnybot/docs/api" className="text-gold hover:underline">
          How it works
        </Link>
      </p>

      {note && (
        <p role={note.tone === "error" ? "alert" : "status"} className={`rounded-md border px-4 py-3 text-sm ${note.tone === "error" ? "border-red-500/40 bg-red-500/10 text-red-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"}`}>
          {note.text}
        </p>
      )}

      <section className="rounded-xl border border-surface-border bg-surface p-5">
        <h2 className="font-semibold text-gold">What the plugin may report</h2>
        <p className="mt-1 text-xs text-muted">Everything is off until you switch it on. Anything you leave off is thrown away, even if the plugin sends it.</p>
        <div className="mt-4 space-y-2">
          {view.categories.map((c) => {
            const on = view.consented.includes(c.key);
            return (
              <label key={c.key} className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-surface-border/60 bg-background/40 px-4 py-3">
                <span>
                  <span className="block text-sm font-medium">{c.label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{c.description}</span>
                </span>
                <span className="relative mt-0.5 shrink-0">
                  <input type="checkbox" className="peer sr-only" checked={on} disabled={pending} onChange={(e) => toggle(c.key, e.target.checked)} />
                  <span className="block h-6 w-11 rounded-full bg-white/15 transition peer-checked:bg-gold peer-focus-visible:ring-2 peer-focus-visible:ring-gold/60" />
                  <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-muted">
          {view.rsns.length > 0 ? (
            <>
              It can report for: <span className="text-foreground">{view.rsns.join(", ")}</span>. Link more names with /rs in Discord.
            </>
          ) : (
            "You have no RuneScape name linked yet. Link one with /rs in Discord (or on the Overview tab); the plugin can only report for names linked to you."
          )}
        </p>
      </section>

      <section className="rounded-xl border border-surface-border bg-surface p-5">
        <h2 className="font-semibold text-gold">Plugin tokens</h2>
        <p className="mt-1 text-xs text-muted">
          A token is the password you paste into the plugin. It is shown once, here, when you make it. If you lose it, revoke it and make another.
        </p>

        {fresh && (
          <div className="mt-4 rounded-lg border border-gold/50 bg-gold/10 p-4">
            <p className="text-sm font-medium">Your new token. Copy it now: it won&apos;t be shown again.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input readOnly className={`${field} min-w-0 flex-1 font-mono`} value={fresh} aria-label="New plugin token" onFocus={(e) => e.currentTarget.select()} />
              <button type="button" className={ghost} onClick={() => copy(fresh)}>
                {copied ? "Copied" : "Copy"}
              </button>
              <button type="button" className={ghost} onClick={() => setFresh(null)}>
                Done
              </button>
            </div>
          </div>
        )}

        {active.length > 0 && (
          <ul className="mt-4 divide-y divide-surface-border/60 rounded-lg border border-surface-border/60">
            {active.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{t.label}</span> <span className="font-mono text-xs text-muted">{t.preview}</span>
                  <span className="block text-xs text-muted">
                    Made {shortDate(t.createdAt)} · {t.lastUsedAt ? `last used ${shortDate(t.lastUsedAt)}` : "never used"}
                  </span>
                </span>
                <button type="button" className={danger} disabled={pending} onClick={() => revoke(t.id)}>
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input className={`${field} max-w-xs`} placeholder="Name it, e.g. Gaming PC" value={label} maxLength={40} aria-label="Token name" onChange={(e) => setLabel(e.target.value)} />
          <button type="button" className={primary} disabled={pending || active.length >= view.maxTokens} onClick={make}>
            Make a token
          </button>
          {active.length >= view.maxTokens && <span className="text-xs text-muted">You have {view.maxTokens} active tokens. Revoke one to make another.</span>}
        </div>
      </section>

      {view.grants && (
        <section className="rounded-xl border border-surface-border bg-surface p-5">
          <h2 className="font-semibold text-gold">Other bots that can see your plugin data</h2>
          <p className="mt-1 text-xs text-muted">Bots ask you on the RS Link page; nothing is shared until you allow it there. Remove one here at any time.</p>
          {view.grants.length === 0 ? (
            <p className="mt-3 text-sm text-muted">None.</p>
          ) : (
            <ul className="mt-4 divide-y divide-surface-border/60 rounded-lg border border-surface-border/60">
              {view.grants.map((g) => (
                <li key={g.appId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span>
                    <span className="font-medium">{g.appName ?? "A bot"}</span>
                    <span className="block text-xs text-muted">
                      Sees: {g.categories.length ? g.categories.join(", ").toLowerCase() : "nothing from the plugin"}
                      {g.identity ? " · knows your Discord account" : ""} · since {shortDate(g.createdAt)}
                    </span>
                  </span>
                  <button type="button" className={danger} disabled={pending} onClick={() => removeGrant(g.appId, g.appName ?? "That bot")}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="rounded-xl border border-surface-border bg-surface p-5">
        <h2 className="font-semibold text-gold">Your data</h2>
        <p className="mt-1 text-sm text-muted">
          JonnyBot holds {view.storedEvents} {view.storedEvents === 1 ? "event" : "events"} the plugin reported about you. They are deleted automatically after 180 days.
        </p>
        <button type="button" className={`${danger} mt-3`} disabled={pending} onClick={wipe}>
          Delete everything the plugin sent
        </button>
      </section>
    </div>
  );
}
