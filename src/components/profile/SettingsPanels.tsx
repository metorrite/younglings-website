"use client";

import { useState, useTransition } from "react";
import { addGoalAction, deleteGoalAction, saveSettingsAction, toggleRoleAction } from "@/app/profile/actions";
import { ProgressBar } from "@/components/site/blocks";
import { SkillIcon } from "@/components/site/SkillIcon";
import type { Goal, MemberSettings, SelfRole } from "@/lib/member";
import { SKILL_NAMES, compact, shortDate } from "@/lib/site";

const field = "w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm outline-none focus:border-gold disabled:opacity-50";
const primary = "rounded-md bg-gold px-4 py-2 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-50";
const ghost = "rounded-md border border-surface-border px-3 py-1.5 text-sm text-muted transition hover:text-foreground disabled:opacity-40";

const ACCENTS = ["#d4af37", "#e74c3c", "#e67e22", "#2ecc71", "#1abc9c", "#3498db", "#9b59b6", "#e91e8c"];

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-surface-border/60 bg-background/40 px-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
      </span>
      <span className="relative mt-0.5 shrink-0">
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="block h-6 w-11 rounded-full bg-white/15 transition peer-checked:bg-gold peer-focus-visible:ring-2 peer-focus-visible:ring-gold/60" />
        <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function Status({ error, saved }: { error: string | null; saved: boolean }) {
  if (error) return <p role="alert" className="text-sm text-red-400">{error}</p>;
  if (saved) return <p role="status" className="text-sm text-emerald-400">Saved.</p>;
  return null;
}

// ---------- public profile + privacy ----------

export function PublicProfileForm({ initial }: { initial: MemberSettings }) {
  const [s, setS] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof MemberSettings>(key: K, value: MemberSettings[K]) => {
    setS((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  function save() {
    setError(null);
    start(async () => {
      const result = await saveSettingsAction(s);
      if (!result.ok) setError(result.error);
      else {
        setS(result.data);
        setSaved(true);
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium" htmlFor="bio">About me</label>
        <p className="mt-0.5 text-xs text-muted">Shown on your public clan profile.</p>
        <textarea id="bio" value={s.bio} maxLength={280} onChange={(e) => set("bio", e.target.value)} placeholder="Tell the clan a bit about yourself…" className={`${field} mt-2 min-h-24`} />
        <p className="mt-1 text-right text-xs text-muted">{s.bio.length}/280</p>
      </div>

      <div>
        <p className="text-sm font-medium">Profile accent colour</p>
        <p className="mt-0.5 text-xs text-muted">Tints the glow and quote line on your profile.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {ACCENTS.map((hex) => (
            <button
              key={hex}
              type="button"
              aria-label={`Use ${hex}`}
              onClick={() => set("accentColor", hex)}
              className="h-8 w-8 rounded-full transition"
              style={{ backgroundColor: hex, outline: s.accentColor === hex ? "2px solid white" : "none", outlineOffset: "2px" }}
            />
          ))}
          <input type="color" aria-label="Pick a custom colour" value={s.accentColor ?? "#d4af37"} onChange={(e) => set("accentColor", e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-surface-border bg-transparent" />
          <button type="button" className={ghost} onClick={() => set("accentColor", null)}>
            Default
          </button>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium" htmlFor="pinned">Favourite skill</label>
        <p className="mt-0.5 text-xs text-muted">Highlighted under your name.</p>
        <select id="pinned" className={`${field} mt-2 max-w-xs`} value={s.pinnedSkill ?? ""} onChange={(e) => set("pinnedSkill", e.target.value === "" ? null : Number(e.target.value))}>
          <option value="">None</option>
          {SKILL_NAMES.map((name, id) => (
            <option key={name} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium">Privacy</p>
        <Switch checked={s.hideAdventureLog} onChange={(v) => set("hideAdventureLog", v)} label="Keep my adventure log private" hint="Hides your log from your profile, the activity feed, drop log and PvM tallies." />
        <Switch checked={s.hideDiscordLink} onChange={(v) => set("hideDiscordLink", v)} label="Don't link my Discord name to my profile" hint="In the home page's Who's Online list, your name normally opens your clan profile. Turn this on and it opens your Discord profile instead." />
        <Switch checked={s.hideFromLeaderboards} onChange={(v) => set("hideFromLeaderboards", v)} label="Leave me out of the rankings" hint="You stay on the member list, but not on XP, Citadel or record leaderboards." />
      </div>

      <div className="flex items-center gap-4">
        <button type="button" className={primary} disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save profile"}
        </button>
        <Status error={error} saved={saved} />
      </div>
    </div>
  );
}

// ---------- notifications ----------

export function NotificationsForm({ initial }: { initial: MemberSettings }) {
  const [s, setS] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function change(patch: Partial<MemberSettings>) {
    const next = { ...s, ...patch };
    setS(next);
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await saveSettingsAction(next);
      if (!result.ok) {
        setError(result.error);
        setS(s);
      } else {
        setS(result.data);
        setSaved(true);
      }
    });
  }

  return (
    <div className="space-y-3">
      <Switch checked={s.dmGoals} onChange={(v) => change({ dmGoals: v })} label="DM me when I reach a goal" hint="JonnyBot sends you a Discord message the moment a skill goal is reached." />
      <Switch checked={s.dmEvents} onChange={(v) => change({ dmEvents: v })} label="Remind me before events" hint="A DM about 30 minutes before any Discord event starts." />
      <div className="h-5">{pending ? <p className="text-sm text-muted">Saving…</p> : <Status error={error} saved={saved} />}</div>
      <p className="text-xs text-muted">Messages come from JonnyBot. If you have DMs from server members turned off in Discord, they can&apos;t be delivered.</p>
    </div>
  );
}

// ---------- goals ----------

export function GoalsManager({ initial, hasLink }: { initial: Goal[]; hasLink: boolean }) {
  const [goals, setGoals] = useState(initial);
  const [skill, setSkill] = useState(0);
  const [level, setLevel] = useState(99);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function add() {
    setError(null);
    start(async () => {
      const result = await addGoalAction(skill, level);
      if (!result.ok) setError(result.error);
      else setGoals(result.data);
    });
  }

  function remove(id: string) {
    setError(null);
    start(async () => {
      const result = await deleteGoalAction(id);
      if (!result.ok) setError(result.error);
      else setGoals(result.data);
    });
  }

  const active = goals.filter((g) => !g.achievedAt);
  const done = goals.filter((g) => g.achievedAt);

  return (
    <div className="space-y-6">
      {!hasLink && (
        <p className="rounded-lg border border-dashed border-surface-border p-4 text-sm text-muted">
          Goals track your linked RuneScape account. Use <code className="rounded bg-white/10 px-1">/rs</code> in the Younglings Discord to link yours first.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">Skill</span>
          <select className={field} value={skill} onChange={(e) => setSkill(Number(e.target.value))} disabled={!hasLink}>
            {SKILL_NAMES.map((name, id) => (
              <option key={name} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-muted">Target level</span>
          <input type="number" min={2} max={120} value={level} onChange={(e) => setLevel(Number(e.target.value))} className={`${field} w-28`} disabled={!hasLink} />
        </label>
        <button type="button" className={primary} disabled={pending || !hasLink} onClick={add}>
          Add goal
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}

      {active.length === 0 && done.length === 0 && hasLink && <p className="text-sm text-muted">No goals yet — pick a skill and a level above.</p>}

      {active.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {active.map((g) => (
            <li key={g.id} className="rounded-lg border border-surface-border/60 bg-background/40 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="flex items-center gap-2 font-medium">
                  <SkillIcon name={g.skill} size={22} />
                  {g.skill} <span className="text-muted">→ {g.targetLevel}</span>
                </p>
                <button type="button" className="text-xs text-muted hover:text-red-400" onClick={() => remove(g.id)} disabled={pending} aria-label={`Remove the ${g.skill} goal`}>
                  Remove
                </button>
              </div>
              <div className="mt-3">
                <ProgressBar value={g.progress * 100} max={100} />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {g.currentLevel !== null ? `Level ${g.currentLevel} now · ` : ""}
                {compact(g.xpRemaining)} XP to go
              </p>
            </li>
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <div>
          <p className="mb-2 text-xs tracking-wider text-muted uppercase">Reached</p>
          <ul className="flex flex-wrap gap-2">
            {done.map((g) => (
              <li key={g.id} className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-300">
                <SkillIcon name={g.skill} size={18} />
                {g.skill} {g.targetLevel} 🎉
                <span className="text-xs text-emerald-300/70">{g.achievedAt ? shortDate(g.achievedAt) : ""}</span>
                <button type="button" className="text-xs text-emerald-300/60 hover:text-red-300" onClick={() => remove(g.id)} aria-label={`Clear the ${g.skill} goal`}>
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------- self-assignable roles ----------

export function SelfRoles({ initial }: { initial: SelfRole[] }) {
  const [roles, setRoles] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(role: SelfRole) {
    setError(null);
    start(async () => {
      const result = await toggleRoleAction(role.roleId, !role.has);
      if (!result.ok) setError(result.error);
      else setRoles(result.data);
    });
  }

  if (roles.length === 0) return <p className="text-sm text-muted">No roles are available to pick yet — the server admins can add some from the admin dashboard.</p>;

  return (
    <div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {roles.map((role) => (
          <li key={role.roleId}>
            <button
              type="button"
              aria-pressed={role.has}
              disabled={pending}
              onClick={() => toggle(role)}
              className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition disabled:opacity-60 ${role.has ? "border-gold bg-gold/10" : "border-surface-border/60 bg-background/40 hover:border-gold/40"}`}
            >
              <span className="mt-1 h-3 w-3 shrink-0 rounded-full border border-white/20" style={{ backgroundColor: role.color > 0 ? `#${role.color.toString(16).padStart(6, "0")}` : "transparent" }} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{role.label}</span>
                {role.description && <span className="block text-xs text-muted">{role.description}</span>}
              </span>
              <span className="shrink-0 text-xs text-muted">{role.has ? "Have it ✓" : "Add"}</span>
            </button>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
