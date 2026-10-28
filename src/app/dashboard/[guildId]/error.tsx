"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ErrorReference } from "@/components/admin/ErrorPanel";
import { ghostButton, primaryButton } from "@/components/admin/ui";
import { isBotUnreachable } from "@/lib/botUnreachable";

/**
 * Shown in place of one page when it can't be drawn. The sidebar stays, so nobody is stranded: they can try again, go to the Overview, or open another page.
 * It blames JonnyBot only when the bot really didn't answer; any other error is a fault in the page and shows its reference for a bug report.
 */
export default function GuildPageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const pathname = usePathname();
  const overview = pathname.split("/").slice(0, 3).join("/") || "/dashboard";
  const unreachable = isBotUnreachable(error);
  return (
    <div role="alert" className="mx-auto max-w-xl rounded-xl border border-surface-border bg-surface p-8 text-center">
      <h1 className="text-xl font-semibold">{unreachable ? "JonnyBot didn't answer" : "This page couldn't load"}</h1>
      <p className="mt-3 text-sm text-muted">
        {unreachable
          ? "The bot isn't answering right now, so this page can't be shown. Nothing was changed. Try again in a moment, or pick another page from the list on the left."
          : "This page hit an error while loading. Nothing was changed. Try again, or pick another page from the list on the left; if it keeps happening, report it with the reference below."}
      </p>
      <ErrorReference reference={unreachable ? null : (error.digest ?? null)} />
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={() => retry()} className={primaryButton}>
          Try again
        </button>
        <Link href={overview} className={`${ghostButton} inline-block`}>
          Go to the Overview
        </Link>
      </div>
    </div>
  );
}
