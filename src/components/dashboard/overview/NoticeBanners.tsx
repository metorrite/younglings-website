import type { BotNotice } from "@/lib/jonnybot-admin";

const STYLE: Record<BotNotice["severity"], { box: string; chip: string; label: string }> = {
  issue: { box: "border-red-500/40 bg-red-500/10", chip: "bg-red-500/20 text-red-300", label: "Known issue" },
  warning: { box: "border-amber-500/40 bg-amber-500/10", chip: "bg-amber-500/20 text-amber-200", label: "Heads up" },
  info: { box: "border-sky-500/40 bg-sky-500/10", chip: "bg-sky-500/20 text-sky-200", label: "News" },
};

/** Messages from the person who runs JonnyBot, shown at the top of every server's dashboard: a known issue, planned downtime. Worst first. */
export function NoticeBanners({ notices }: { notices: BotNotice[] }) {
  if (notices.length === 0) return null;
  const order = { issue: 0, warning: 1, info: 2 } as const;
  const sorted = [...notices].sort((a, b) => order[a.severity] - order[b.severity]);

  return (
    <div className="space-y-2" role="region" aria-label="Notices from JonnyBot">
      {sorted.map((notice) => {
        const style = STYLE[notice.severity];
        return (
          <div key={notice.id} className={`flex flex-wrap items-start gap-3 rounded-lg border px-4 py-3 text-sm ${style.box}`}>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.chip}`}>{style.label}</span>
            <p className="min-w-0 flex-1 break-words whitespace-pre-line">{notice.body}</p>
          </div>
        );
      })}
    </div>
  );
}
