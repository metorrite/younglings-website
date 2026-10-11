"use client";

import { useState, useTransition } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import {
  dangerButton,
  FormField,
  ghostButton,
  inputClass,
  Notice,
  primaryButton,
  StatusBadge,
} from "@/components/admin/ui";
import {
  Chip,
  CollapsibleCard,
} from "@/components/dashboard/ui/CollapsibleCard";
import {
  choicesOf,
  type GiveawayList,
  type GiveawayStart,
  type GuildRole,
  type GuildStructure,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";

export interface GiveawayActions {
  start: (body: GiveawayStart) => Promise<WelcomeActionResult<GiveawayList>>;
  end: (id: string) => Promise<WelcomeActionResult<GiveawayList>>;
  reroll: (id: string) => Promise<WelcomeActionResult<GiveawayList>>;
  remove: (id: string) => Promise<WelcomeActionResult<GiveawayList>>;
}

type Problem = { title: string; items: string[] } | null;

const LENGTHS = [
  { minutes: 60, label: "1 hour" },
  { minutes: 360, label: "6 hours" },
  { minutes: 1440, label: "1 day" },
  { minutes: 4320, label: "3 days" },
  { minutes: 10080, label: "1 week" },
];

/** Starts giveaways and manages the recent ones: how many entered, end one early, draw again, or take it down. */
export function GiveawaysManager({
  initial,
  structure,
  roles,
  actions,
}: {
  initial: GiveawayList;
  structure: GuildStructure;
  roles: GuildRole[];
  actions: GiveawayActions;
}) {
  const [list, setList] = useState(initial);
  const [prize, setPrize] = useState("");
  const [channelId, setChannelId] = useState<string | null>(null);
  const [minutes, setMinutes] = useState(1440);
  const [winners, setWinners] = useState(1);
  const [roleId, setRoleId] = useState("");
  const [problem, setProblem] = useState<Problem>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const giveable = roles
    .filter((r) => r.id)
    .sort((a, b) => b.position - a.position);

  function run(
    work: () => Promise<WelcomeActionResult<GiveawayList>>,
    done: string,
    after?: () => void,
  ) {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await work();
      if (!result.ok)
        return setProblem({ title: result.error, items: result.problems });
      setList(result.data);
      setNote(done);
      after?.();
    });
  }

  const running = list.giveaways.filter((g) => g.status === "OPEN");
  const ended = list.giveaways.filter((g) => g.status === "ENDED");

  return (
    <div className="space-y-6">
      <CollapsibleCard
        id="gw-start"
        title="Start a giveaway"
        hint="Choose a prize, a channel and how long it runs."
        defaultOpen={running.length === 0}
        summary={<Chip>{running.length} running</Chip>}
        info="JonnyBot posts a message with an Enter button. People press it to enter and again to leave. When time is up it draws the winners at random from people still in the server and announces them."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField label="Prize">
            <input
              className={inputClass}
              value={prize}
              maxLength={list.maxPrize}
              placeholder="Rune pouch"
              onChange={(e) => setPrize(e.target.value)}
            />
          </FormField>
          <FormField label="Channel" as="group">
            <ChannelSelect
              {...choicesOf(structure)}
              onlyPostable
              allowForums={false}
              value={channelId}
              onChange={setChannelId}
              none="Choose a channel…"
            />
          </FormField>
        </div>
        <FormField label="How long it runs" as="group">
          <div className="flex flex-wrap items-center gap-2">
            {LENGTHS.map((l) => (
              <button
                key={l.minutes}
                type="button"
                aria-pressed={minutes === l.minutes}
                onClick={() => setMinutes(l.minutes)}
                className={`rounded-full border px-3 py-1 text-xs transition ${minutes === l.minutes ? "border-gold bg-gold/15 text-foreground" : "border-surface-border text-muted hover:text-foreground"}`}
              >
                {l.label}
              </button>
            ))}
            <span className="flex items-center gap-1.5 text-xs text-muted">
              or
              <input
                type="number"
                min={1}
                value={minutes}
                aria-label="Minutes"
                onChange={(e) =>
                  setMinutes(
                    Math.max(1, Math.trunc(Number(e.target.value) || 1)),
                  )
                }
                className={`${inputClass} w-24`}
              />
              minutes
            </span>
          </div>
        </FormField>
        <div className="grid gap-4 lg:grid-cols-2">
          <FormField label="Winners">
            <input
              type="number"
              min={1}
              max={list.maxWinners}
              className={`${inputClass} w-24`}
              value={winners}
              onChange={(e) =>
                setWinners(
                  Math.max(
                    1,
                    Math.min(
                      list.maxWinners,
                      Math.trunc(Number(e.target.value) || 1),
                    ),
                  ),
                )
              }
            />
          </FormField>
          <FormField
            label="Only for a role (optional)"
            info="Leave empty to let everyone enter. Winners must still hold the role when the draw happens."
          >
            <select
              className={inputClass}
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
            >
              <option value="">Anyone can enter</option>
              {giveable.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>
        <button
          type="button"
          className={primaryButton}
          disabled={pending || !prize.trim() || !channelId}
          onClick={() =>
            run(
              () =>
                actions.start({
                  prize,
                  channelId: channelId!,
                  durationMinutes: minutes,
                  winners,
                  requiredRoleId: roleId || null,
                }),
              "Started. It is posted in the channel.",
              () => setPrize(""),
            )
          }
        >
          {pending ? "Working…" : "Start the giveaway"}
        </button>
      </CollapsibleCard>

      {problem && (
        <Notice tone="error" title={problem.title} items={problem.items} />
      )}
      {note && <Notice tone="success" title={note} />}

      <Section title="Running" empty="Nothing is running." items={running}>
        {(g) => (
          <>
            <ActionButton
              onClick={() => run(() => actions.end(g.id), "Ended and drawn.")}
              disabled={pending}
            >
              End now
            </ActionButton>
            <button
              type="button"
              className={dangerButton}
              disabled={pending}
              onClick={() =>
                window.confirm(
                  `Delete the giveaway for "${g.prize}"? Its message is taken down.`,
                ) && run(() => actions.remove(g.id), "Deleted.")
              }
            >
              Delete
            </button>
          </>
        )}
      </Section>

      <Section title="Ended" empty="Nothing has ended yet." items={ended}>
        {(g) => (
          <>
            <ActionButton
              onClick={() => run(() => actions.reroll(g.id), "Drew again.")}
              disabled={pending}
            >
              Draw again
            </ActionButton>
            <button
              type="button"
              className={dangerButton}
              disabled={pending}
              onClick={() =>
                window.confirm(`Delete the giveaway for "${g.prize}"?`) &&
                run(() => actions.remove(g.id), "Deleted.")
              }
            >
              Delete
            </button>
          </>
        )}
      </Section>
    </div>
  );
}

function ActionButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={ghostButton} {...rest}>
      {children}
    </button>
  );
}

function Section({
  title,
  empty,
  items,
  children,
}: {
  title: string;
  empty: string;
  items: GiveawayList["giveaways"];
  children: (g: GiveawayList["giveaways"][number]) => React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wider text-muted uppercase">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-surface-border p-6 text-center text-sm text-muted">
          {empty}
        </p>
      ) : (
        <ul className="grid gap-3 xl:grid-cols-2">
          {items.map((g) => (
            <li
              key={g.id}
              className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-5"
            >
              <div>
                <p className="font-semibold">🎉 {g.prize}</p>
                <p className="mt-0.5 text-sm text-muted">
                  #{g.channelName ?? "deleted channel"} · {g.winnerCount} winner
                  {g.winnerCount === 1 ? "" : "s"} ·{" "}
                  {g.status === "OPEN" ? "ends" : "ended"}{" "}
                  {new Date(g.endsAt).toLocaleString()}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={g.status === "OPEN" ? "good" : "muted"}>
                  {g.entries} entered
                </StatusBadge>
                {g.requiredRoleId && (
                  <StatusBadge tone="warn">Role only</StatusBadge>
                )}
                {g.status === "ENDED" && g.winners.length === 0 && (
                  <StatusBadge tone="muted">No winner</StatusBadge>
                )}
              </div>
              <div className="mt-auto flex flex-wrap gap-2">{children(g)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
