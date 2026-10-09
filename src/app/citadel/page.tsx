import Link from "next/link";
import { PageHeader, Panel, Unavailable } from "@/components/site/blocks";
import { RsChathead } from "@/components/site/RsChathead";
import { getCitadelGrid, shortDay } from "@/lib/site";
import { Tip, TipBody } from "@/components/ui/Tip";

export const metadata = { title: "Citadel attendance — Younglings" };
export const dynamic = "force-dynamic";

const CELL = ["bg-white/[0.06]", "bg-sky-500/60", "bg-gold"];
const LABEL = ["no visit recorded", "visited", "capped"];

export default async function CitadelPage() {
  const grid = await getCitadelGrid(12);

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-12 sm:px-6">
      <PageHeader title="Citadel attendance" subtitle="Every member by every Citadel week (Wednesday to Tuesday). Gold means they capped, blue that they visited." />

      {grid === null ? (
        <Unavailable what="The attendance grid" />
      ) : (
        <Panel>
          <div className="mb-4 flex flex-wrap items-center gap-4 text-xs text-muted">
            {[2, 1, 0].map((v) => (
              <span key={v} className="flex items-center gap-1.5">
                <span className={`h-3.5 w-3.5 rounded ${CELL[v]}`} />
                {LABEL[v]}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="border-separate border-spacing-1 text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-surface pr-3 text-left font-medium text-muted">Member</th>
                  {grid.weeks.map((w) => (
                    <th key={w} className="px-0.5 pb-1 text-center font-normal whitespace-nowrap text-muted [writing-mode:vertical-rl] rotate-180">
                      {shortDay(w)}
                    </th>
                  ))}
                  <th className="pl-2 text-left font-medium text-muted">Caps</th>
                </tr>
              </thead>
              <tbody>
                {grid.members.map((m) => (
                  <tr key={m.rsn}>
                    <td className="sticky left-0 bg-surface pr-3 whitespace-nowrap">
                      <span className="flex items-center gap-2">
                        <RsChathead rsn={m.rsn} size={20} />
                        <Link href={`/members/${encodeURIComponent(m.rsn)}`} className="hover:text-gold">
                          {m.rsn}
                        </Link>
                      </span>
                    </td>
                    {m.weeks.map((v, i) => (
                      <td key={i}>
                        <Tip content={<TipBody title={m.rsn} rows={[["Week of", shortDay(grid.weeks[i])], ["Citadel", LABEL[v]]]} />}>
                          <span className={`block h-5 w-5 rounded ${CELL[v]}`} />
                        </Tip>
                      </td>
                    ))}
                    <td className="pl-2 text-muted tabular-nums">{m.weeks.filter((v) => v === 2).length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
