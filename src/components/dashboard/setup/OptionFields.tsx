"use client";

/* eslint-disable @next/next/no-img-element -- fixed preview pictures from /public/bingo-looks; next/image would only re-encode them */

import type { ReactNode } from "react";
import { ChannelSelect } from "@/components/admin/pickers";
import { FormField, inputClass } from "@/components/admin/ui";
import { BingoLookPicker } from "@/components/dashboard/BingoLookPicker";
import { ShapeSizeControl } from "@/components/dashboard/ShapeSizeControl";
import { PrizeListEditor } from "@/components/dashboard/setup/PrizeListEditor";
import { FieldGrid, PanelGrid, Span } from "@/components/dashboard/ui/Layout";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { Toggle } from "@/components/dashboard/ui/Toggle";
import { getPath, isRequired, isoToLocalInput, localInputToIso, type Answers, type OptionDef } from "@/lib/eventOptions";
import { BINGO_LOOKS, DEFAULT_BINGO_LOOK, type EventPrize } from "@/lib/eventTypes";
import { choicesOf, type GuildStructure } from "@/lib/jonnybot-admin";

const MAX_DIGITS = 15;

function rangeText(opt: OptionDef): string | null {
  if (opt.min !== null && opt.max !== null) return `${opt.min.toLocaleString("en-GB")} to ${opt.max.toLocaleString("en-GB")}.`;
  if (opt.max !== null) return `Up to ${opt.max.toLocaleString("en-GB")}.`;
  if (opt.min !== null && opt.min > 0) return `At least ${opt.min.toLocaleString("en-GB")}.`;
  return null;
}

/** The shapes a bingo can have, drawn in the look chosen so far. */
function ShapePicker({ opt, value, look, onChange, disabled }: { opt: OptionDef; value: string; look: string; onChange: (id: string) => void; disabled: boolean }) {
  return (
    <div role="radiogroup" aria-label={opt.label} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {opt.choices.map((c) => {
        const selected = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(c.value)}
            className={`overflow-hidden rounded-lg border bg-surface text-left transition disabled:opacity-60 ${selected ? "border-gold ring-2 ring-gold/60" : "border-surface-border hover:border-gold/60"}`}
          >
            <img src={`/bingo-looks/${c.value}-${look}.jpg`} alt={`The ${c.label} board`} width={640} height={400} loading="lazy" className="block aspect-[8/5] w-full object-cover" />
            <span className="block space-y-0.5 p-2.5">
              <span className="flex items-center gap-2 text-sm font-medium">
                <span aria-hidden className={`inline-block size-3 rounded-full border ${selected ? "border-gold bg-gold" : "border-muted"}`} />
                {c.label}
              </span>
              <span className="block text-xs text-muted">{c.hint}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The three options that describe one channel of an event (how it is provided, which channel, what it is called) are drawn together as one row. */
const SLOT_HEAD = /^config\.channels\.slots\.(\w+)\.use$/;
const SLOT_PART = /^config\.channels\.(?:slots\.\w+\.channelId|names\.\w+)$/;

/**
 * One of the event's channels as a row: a switch for whether the event has it, and, while it does, a second for who provides it. "JonnyBot makes it" is on to
 * begin with and shows the name; off, the same place shows a picker for a channel that already exists. It reads and writes the same three answers as the
 * separate options did, so nothing that reads them changes.
 */
function SlotField({ opt, options, answers, onChange, structure, highlight, disabled }: { opt: OptionDef; options: OptionDef[]; answers: Answers; onChange: (path: string, value: unknown) => void; structure: GuildStructure; highlight: boolean; disabled: boolean }) {
  const match = SLOT_HEAD.exec(opt.path);
  const key = match ? match[1] : "";
  const channelPath = `config.channels.slots.${key}.channelId`;
  const namePath = `config.channels.names.${key}`;
  const use = String(getPath(answers, opt.path) ?? "create");
  const channelId = getPath(answers, channelPath);
  const name = getPath(answers, namePath);
  const makes = use === "create";
  const nameHint = options.find((o) => o.path === namePath)?.hint ?? "{event} is the event's name. Leave it empty for the usual name.";
  return (
    <div className={highlight ? "rounded-lg ring-1 ring-red-500/60 ring-offset-4 ring-offset-surface" : undefined}>
      <SettingRow title={opt.label} hint={opt.hint} checked={use !== "none"} disabled={disabled} onChange={(on) => onChange(opt.path, on ? "create" : "none")} offHint="Left out: nothing is made or chosen for this.">
        <Toggle
          checked={makes}
          disabled={disabled}
          label="JonnyBot makes it"
          detail={makes ? "Made inside the event's category when you set up the channels." : "Off: pick a channel you already have. JonnyBot uses it but never changes who can see it."}
          onChange={(on) => onChange(opt.path, on ? "create" : "existing")}
        />
        {makes ? (
          <FormField label="Name" size="md" hint={nameHint}>
            <input className={inputClass} disabled={disabled} maxLength={100} value={typeof name === "string" ? name : ""} onChange={(e) => onChange(namePath, e.target.value === "" ? undefined : e.target.value)} />
          </FormField>
        ) : (
          <FormField label="Channel to use" size="lg" required as="group">
            <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={typeof channelId === "string" && channelId !== "" ? channelId : null} onChange={(id) => onChange(channelPath, id ?? undefined)} none="Choose a channel" />
          </FormField>
        )}
      </SettingRow>
    </div>
  );
}

function OptionField({
  opt,
  answers,
  onChange,
  structure,
  highlight,
  disabled,
}: {
  opt: OptionDef;
  answers: Answers;
  onChange: (path: string, value: unknown) => void;
  structure: GuildStructure;
  highlight: boolean;
  disabled: boolean;
}) {
  const value = getPath(answers, opt.path);
  const set = (next: unknown) => onChange(opt.path, next);
  const required = isRequired(opt, answers);
  const range = rangeText(opt);
  const hint = (
    <>
      {opt.hint}
      {range && opt.type === "INT" && ` ${range}`}
    </>
  );
  const wrap = (body: ReactNode) => <div className={highlight ? "rounded-lg ring-1 ring-red-500/60 ring-offset-4 ring-offset-surface" : undefined}>{body}</div>;

  switch (opt.type) {
    case "BOOL":
      return wrap(<Toggle checked={value === true} onChange={set} label={opt.label} detail={opt.hint} disabled={disabled} />);

    case "TEXT":
      return wrap(
        <FormField label={opt.label} hint={hint} required={required}>
          <input className={inputClass} disabled={disabled} maxLength={opt.maxLength ?? undefined} value={typeof value === "string" ? value : ""} onChange={(e) => set(e.target.value)} />
        </FormField>,
      );

    case "TEXTAREA":
      return wrap(
        <FormField label={opt.label} hint={hint} required={required}>
          <textarea className={`${inputClass} min-h-20`} disabled={disabled} maxLength={opt.maxLength ?? undefined} value={typeof value === "string" ? value : ""} onChange={(e) => set(e.target.value)} />
        </FormField>,
      );

    case "INT": {
      if (opt.widget === "shapesize") {
        const shape = String(getPath(answers, "config.board.layout") ?? "grid");
        return wrap(
          <FormField label={opt.label} hint={hint} as="group">
            <ShapeSizeControl shape={shape} value={typeof value === "number" ? value : 0} disabled={disabled} onChange={(n) => set(n === 0 ? undefined : n)} />
          </FormField>,
        );
      }
      // an option that needs at least 1 (a buy-in amount) is shown empty rather than as 0 until it is filled in
      const emptyZero = value === 0 && opt.min !== null && opt.min > 0;
      const text = value === undefined || value === null || emptyZero ? "" : String(value);
      const n = typeof value === "number" && !emptyZero ? value : null;
      const outside = n !== null && ((opt.min !== null && n < opt.min) || (opt.max !== null && n > opt.max));
      return wrap(
        <FormField label={opt.label} hint={outside ? <span className="text-red-400">{range ?? "That is outside what is allowed."}</span> : hint} required={required}>
          <input
            className={inputClass}
            disabled={disabled}
            inputMode="numeric"
            value={text}
            onChange={(e) => {
              const digits = e.target.value.replace(/[^\d]/g, "").slice(0, MAX_DIGITS);
              set(digits === "" ? undefined : Number(digits));
            }}
          />
          {n !== null && n >= 10000 && <span className="mt-1 block text-xs text-muted">{n.toLocaleString("en-GB")}</span>}
        </FormField>,
      );
    }

    case "DATETIME":
      return wrap(
        <FormField label={opt.label} hint={hint} required={required}>
          <input className={inputClass} disabled={disabled} type="datetime-local" value={isoToLocalInput(value)} onChange={(e) => set(localInputToIso(e.target.value))} />
        </FormField>,
      );

    case "CHANNEL":
      return wrap(
        <FormField label={opt.label} hint={hint} required={required} size="md" as="group">
          <ChannelSelect {...choicesOf(structure)} onlyPostable allowForums={false} value={typeof value === "string" && value !== "" ? value : null} onChange={(id) => set(id ?? undefined)} none="None" />
        </FormField>,
      );

    case "PRIZES":
      return wrap(
        <FormField label={opt.label} hint={hint} required={required} as="group">
          <PrizeListEditor prizes={Array.isArray(value) ? (value as EventPrize[]) : []} disabled={disabled} onChange={(next) => set(next.length > 0 ? next : undefined)} />
        </FormField>,
      );

    case "CHOICE": {
      if (opt.widget === "look") {
        const shape = String(getPath(answers, "config.board.layout") ?? "grid") || "grid";
        return wrap(
          <FormField label={opt.label} hint={hint} as="group">
            <BingoLookPicker shape={shape} value={typeof value === "string" ? value : DEFAULT_BINGO_LOOK} disabled={disabled} onChange={set} />
          </FormField>,
        );
      }
      if (opt.widget === "shape") {
        const picked = String(getPath(answers, "config.board.look") ?? DEFAULT_BINGO_LOOK);
        const look = BINGO_LOOKS.some((l) => l.id === picked) ? picked : DEFAULT_BINGO_LOOK;
        return wrap(
          <FormField label={opt.label} hint={hint} required={required} as="group">
            <ShapePicker opt={opt} value={typeof value === "string" ? value : ""} look={look} disabled={disabled} onChange={set} />
          </FormField>,
        );
      }
      const current = opt.choices.find((c) => c.value === String(value ?? ""));
      return wrap(
        <FormField label={opt.label} hint={current?.hint ? `${opt.hint} ${current.hint}` : hint} required={required}>
          <select
            className={inputClass}
            disabled={disabled}
            value={value === undefined || value === null ? "" : String(value)}
            onChange={(e) => set(e.target.value === "" ? undefined : opt.numeric ? Number(e.target.value) : e.target.value)}
          >
            {(value === undefined || value === null) && <option value="">Choose…</option>}
            {opt.choices.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </FormField>,
      );
    }
  }
}

/** Whether an option takes the whole width of the form: a long text, the prize list, or a picture picker. */
const isWide = (opt: OptionDef) => opt.type === "TEXTAREA" || opt.type === "PRIZES" || opt.widget === "shape" || opt.widget === "look" || opt.widget === "shapesize";

/**
 * The questions for a list of options, drawn from what the bot says each one is. {@code onChange} is told the option's path and its new answer (undefined to
 * clear it). {@code highlight} outlines the options that are still missing, once the person has tried to go on without them.
 */
export function OptionFields({
  options,
  answers,
  onChange,
  structure,
  highlight = [],
  disabled = false,
}: {
  options: OptionDef[];
  answers: Answers;
  onChange: (path: string, value: unknown) => void;
  structure: GuildStructure;
  highlight?: string[];
  disabled?: boolean;
}) {
  // short fields sit side by side in as many columns as the form is wide enough for; a long one (text, prizes, pictures) takes a row, and the channel
  // rows, which are panels rather than fields, share a row of their own
  const shown = options.filter((opt) => !SLOT_PART.test(opt.path));
  const items: ReactNode[] = [];
  for (let i = 0; i < shown.length; i++) {
    const opt = shown[i];
    if (SLOT_HEAD.test(opt.path)) {
      const slots: OptionDef[] = [];
      while (i < shown.length && SLOT_HEAD.test(shown[i].path)) slots.push(shown[i++]);
      i--;
      items.push(
        <Span key={slots[0].path}>
          <PanelGrid min="22rem" max="36rem">
            {slots.map((slot) => (
              <SlotField
                key={slot.path}
                opt={slot}
                options={options}
                answers={answers}
                onChange={onChange}
                structure={structure}
                highlight={highlight.includes(slot.path) || highlight.includes(`config.channels.slots.${SLOT_HEAD.exec(slot.path)?.[1]}.channelId`)}
                disabled={disabled}
              />
            ))}
          </PanelGrid>
        </Span>,
      );
      continue;
    }
    const field = <OptionField opt={opt} answers={answers} onChange={onChange} structure={structure} highlight={highlight.includes(opt.path)} disabled={disabled} />;
    items.push(isWide(opt) ? <Span key={opt.path}>{field}</Span> : <div key={opt.path}>{field}</div>);
  }
  return <FieldGrid>{items}</FieldGrid>;
}
