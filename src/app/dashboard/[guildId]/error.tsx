"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ghostButton, primaryButton } from "@/components/admin/ui";

/**
 * Shown in place of one page when it can't be drawn. The sidebar stays, so nobody is stranded: they can try again, go to the Overview, or open another page.
 * The usual cause is JonnyBot not answering in time, but the page may also have been asked for something that doesn't exist (an event that was deleted).
 */
export default function GuildPageError({ reset }: { error: Error; reset: () => void }) {
  const pathname = usePathname();
  const overview = pathname.split("/").slice(0, 3).join("/") || "/dashboard";
  return (
    <div role="alert" className="mx-auto max-w-xl rounded-xl border border-surface-border bg-surface p-8 text-center">
      <h1 className="text-xl font-semibold">This page couldn&apos;t load</h1>
      <p className="mt-3 text-sm text-muted">
        JonnyBot may not have answered in time, or what you asked for may not exist any more (an event that was deleted, say). Nothing was changed. Try again, or pick another page from the list on the left.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className={primaryButton}>
          Try again
        </button>
        <Link href={overview} className={`${ghostButton} inline-block`}>
          Go to the Overview
        </Link>
      </div>
    </div>
  );
}
