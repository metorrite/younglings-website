"use client";

import { useState, useTransition } from "react";
import { Card, dangerButton, inputClass, Notice, primaryButton } from "@/components/admin/ui";
import type { BotNotice, WelcomeActionResult } from "@/lib/jonnybot-admin";

type Result = WelcomeActionResult<{ notices: BotNotice[] }>;

const LABEL: Record<BotNotice["severity"], string> = { issue: "Known issue", warning: "Heads up", info: "News" };

/**
 * The owner's way to speak to every server at once: post a notice (a known issue, planned downtime) and take it down when it is over.
 * Only shown to the bot's owner; the bot refuses anyone else however the form is reached.
 */
export function NoticesEditor({
  initial,
  add,
  remove,
}: {
  initial: BotNotice[];
  add: (severity: BotNotice["severity"], body: string) => Promise<Result>;
  remove: (id: string) => Promise<Result>;
}) {
  const [notices, setNotices] = useState(initial);
  const [severity, setSeverity] = useState<BotNotice["severity"]>("issue");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(action: () => Promise<Result>, after?: () => void) {
    setError(null);
    start(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotices(result.data.notices);
      after?.();
    });
  }

  return (
    <Card title="Notices for every server" hint="Only you can see this. What you post shows at the top of every server's dashboard until you remove it.">
      {notices.length === 0 ? (
        <p className="text-sm text-muted">Nothing is posted.</p>
      ) : (
        <ul className="space-y-2">
          {notices.map((notice) => (
            <li key={notice.id} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-surface-border bg-background/40 p-3 text-sm">
              <span className="min-w-0 flex-1 break-words">
                <span className="mr-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-muted">{LABEL[notice.severity]}</span>
                {notice.body}
              </span>
              <button type="button" className={dangerButton} disabled={pending} onClick={() => run(() => remove(notice.id))}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 border-t border-surface-border pt-4">
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="sr-only">Kind of notice</span>
            <select className={`${inputClass} w-auto`} value={severity} onChange={(e) => setSeverity(e.target.value as BotNotice["severity"])}>
              <option value="issue">Known issue</option>
              <option value="warning">Heads up</option>
              <option value="info">News</option>
            </select>
          </label>
        </div>
        <label className="block text-sm">
          <span className="sr-only">Message</span>
          <textarea
            className={inputClass}
            rows={3}
            maxLength={500}
            placeholder="There is a known issue with tickets, we are looking into it."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>
        {error && <Notice tone="error" title={error} />}
        <button type="button" className={primaryButton} disabled={pending || body.trim() === ""} onClick={() => run(() => add(severity, body), () => setBody(""))}>
          {pending ? "Posting…" : "Post notice"}
        </button>
      </div>
    </Card>
  );
}
