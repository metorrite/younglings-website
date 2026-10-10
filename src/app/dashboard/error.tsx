"use client";

import { ghostButton } from "@/components/admin/ui";

/** Shown when something under /dashboard throws, most often because JonnyBot can't be reached (access is never granted because a check couldn't run). */
export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <h1 className="text-xl font-semibold">Can&apos;t reach JonnyBot</h1>
      <p className="mt-3 text-sm text-muted">
        The dashboard checks with the bot on every action, and it isn&apos;t answering right now, so nothing can be shown or changed. Try again in a moment.
      </p>
      <button type="button" onClick={reset} className={`${ghostButton} mt-6`}>
        Try again
      </button>
    </div>
  );
}
