"use client";

import { ErrorReference } from "@/components/admin/ErrorPanel";
import { ghostButton } from "@/components/admin/ui";
import { errorText } from "@/lib/botUnreachable";

/**
 * Shown when something under /dashboard throws. "Can't reach JonnyBot" only when an access check couldn't run because the bot didn't answer (access is
 * never granted because a check couldn't run); any other error says so plainly, with its reference for a bug report.
 */
export default function DashboardError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const { title, body, reference } = errorText(error, "Try again in a moment.");
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm text-muted">{body}</p>
      <ErrorReference reference={reference} />
      <button type="button" onClick={() => retry()} className={`${ghostButton} mt-6`}>
        Try again
      </button>
    </div>
  );
}
