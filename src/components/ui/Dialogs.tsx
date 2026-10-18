"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";

/** One thing a dialog can ask for besides a yes or no: a line of text, a longer text, or a tick box (which can reveal the fields that follow it). */
export type DialogField =
  | { key: string; type: "text" | "textarea"; label: string; placeholder?: string; defaultValue?: string; required?: boolean; maxLength?: number; showWhen?: string }
  | { key: string; type: "checkbox"; label: string; hint?: string; defaultValue?: boolean };

export interface DialogOptions {
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** `danger` colours the confirm button red: use it for anything that deletes or can't be undone. */
  tone?: "default" | "danger";
  fields?: DialogField[];
}

/** The answers of a dialog that asked for fields: text fields by key as strings, tick boxes as booleans. */
export type DialogAnswers = Record<string, string | boolean>;

interface Dialogs {
  /** Asks yes or no. Resolves true when confirmed, false when cancelled (Escape, the backdrop or Cancel). */
  confirm: (options: DialogOptions) => Promise<boolean>;
  /** Asks for the fields in `options.fields` (and a confirm). Resolves with the answers, or null when cancelled. */
  ask: (options: DialogOptions) => Promise<DialogAnswers | null>;
}

const DialogContext = createContext<Dialogs | null>(null);

/** The site's own pop-up questions, in place of the browser's `confirm()` and `prompt()` boxes. */
export function useDialogs(): Dialogs {
  const value = useContext(DialogContext);
  if (!value) throw new Error("useDialogs needs the DialogProvider around the page.");
  return value;
}

interface Open {
  options: DialogOptions;
  resolve: (answers: DialogAnswers | null) => void;
}

const inputClass = "w-full rounded-md border border-surface-border bg-background px-3 py-2 text-sm focus:border-gold focus:outline-none";

function initialAnswers(fields: DialogField[] | undefined): DialogAnswers {
  const answers: DialogAnswers = {};
  for (const f of fields ?? []) answers[f.key] = f.type === "checkbox" ? (f.defaultValue ?? false) : (f.defaultValue ?? "");
  return answers;
}

function DialogBox({ open, onClose }: { open: Open; onClose: (answers: DialogAnswers | null) => void }) {
  const { options } = open;
  const [answers, setAnswers] = useState<DialogAnswers>(() => initialAnswers(options.fields));
  const titleId = useId();
  const firstField = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const confirmButton = useRef<HTMLButtonElement | null>(null);
  const visible = (f: DialogField) => !("showWhen" in f) || f.showWhen === undefined || answers[f.showWhen] === true;
  const missing = (options.fields ?? []).some((f) => f.type !== "checkbox" && f.required && visible(f) && String(answers[f.key] ?? "").trim() === "");

  useEffect(() => {
    // the first thing to type in, otherwise the button, so the keyboard works at once
    (firstField.current ?? confirmButton.current)?.focus();
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  function submit() {
    if (missing) return;
    const result: DialogAnswers = {};
    for (const f of options.fields ?? []) result[f.key] = f.type === "checkbox" ? answers[f.key] === true : String(answers[f.key] ?? "").trim();
    onClose(result);
  }

  const danger = options.tone === "danger";
  const firstTextKey = (options.fields ?? []).find((f) => f.type !== "checkbox")?.key;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose(null);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full max-w-md space-y-4 rounded-xl border bg-surface p-5 shadow-2xl ${danger ? "border-red-500/40" : "border-surface-border"}`}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose(null);
          } else if (e.key === "Enter" && !(e.target instanceof HTMLTextAreaElement) && !(e.target instanceof HTMLButtonElement)) {
            e.preventDefault();
            submit();
          }
        }}
      >
        <h2 id={titleId} className={`text-base font-semibold ${danger ? "text-red-300" : ""}`}>
          {options.title}
        </h2>
        {options.body && <div className="space-y-2 text-sm text-muted whitespace-pre-line">{options.body}</div>}
        {(options.fields ?? []).filter(visible).map((f) => {
          if (f.type === "checkbox") {
            return (
              <label key={f.key} className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5" checked={answers[f.key] === true} onChange={(e) => setAnswers({ ...answers, [f.key]: e.target.checked })} />
                <span>
                  {f.label}
                  {f.hint && <span className="block text-xs text-muted">{f.hint}</span>}
                </span>
              </label>
            );
          }
          const first = f.key === firstTextKey;
          const common = {
            className: inputClass,
            placeholder: f.placeholder,
            maxLength: f.maxLength,
            value: String(answers[f.key] ?? ""),
          };
          return (
            <label key={f.key} className="block space-y-1 text-sm">
              <span className="font-medium">
                {f.label}
                {f.required && <span className="text-red-300"> *</span>}
              </span>
              {f.type === "textarea" ? (
                <textarea
                  {...common}
                  rows={3}
                  ref={first ? (el) => void (firstField.current = el) : undefined}
                  onChange={(e) => setAnswers({ ...answers, [f.key]: e.target.value })}
                />
              ) : (
                <input {...common} ref={first ? (el) => void (firstField.current = el) : undefined} onChange={(e) => setAnswers({ ...answers, [f.key]: e.target.value })} />
              )}
            </label>
          );
        })}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="rounded-md border border-surface-border px-3 py-1.5 text-sm text-muted transition hover:text-foreground" onClick={() => onClose(null)}>
            {options.cancelLabel ?? "Cancel"}
          </button>
          <button
            ref={confirmButton}
            type="button"
            disabled={missing}
            className={
              danger
                ? "rounded-md border border-red-500/50 bg-red-500/15 px-4 py-1.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/25 disabled:opacity-40"
                : "rounded-md bg-gold px-4 py-1.5 text-sm font-semibold text-background transition hover:brightness-110 disabled:opacity-40"
            }
            onClick={submit}
          >
            {options.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

// The mounted provider, so a click handler anywhere on the page can ask a question without being handed a hook first.
let mounted: Dialogs | null = null;

/** Asks yes or no in the site's own pop-up. False when cancelled (and when no page is showing, so nothing destructive runs by accident). */
export function confirmDialog(options: DialogOptions): Promise<boolean> {
  return mounted ? mounted.confirm(options) : Promise.resolve(false);
}

/** Asks for fields in the site's own pop-up. The answers, or null when cancelled. */
export function askDialog(options: DialogOptions): Promise<DialogAnswers | null> {
  return mounted ? mounted.ask(options) : Promise.resolve(null);
}

/** Mount once near the top of the page (the root layout does). Shows one dialog at a time; a second request waits for the first to be answered. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Open[]>([]);

  const ask = useCallback(
    (options: DialogOptions) =>
      new Promise<DialogAnswers | null>((resolve) => {
        setQueue((q) => [...q, { options, resolve }]);
      }),
    [],
  );
  const confirm = useCallback(async (options: DialogOptions) => (await ask(options)) !== null, [ask]);
  const value = useMemo<Dialogs>(() => ({ ask, confirm }), [ask, confirm]);
  useEffect(() => {
    mounted = value;
    return () => {
      if (mounted === value) mounted = null;
    };
  }, [value]);

  const current = queue[0] ?? null;
  return (
    <DialogContext.Provider value={value}>
      {children}
      {current && (
        <DialogBox
          key={queue.length + ":" + current.options.title}
          open={current}
          onClose={(answers) => {
            current.resolve(answers);
            setQueue((q) => q.slice(1));
          }}
        />
      )}
    </DialogContext.Provider>
  );
}
