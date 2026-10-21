import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import type { PremiumGuilds } from "@/lib/jonnybot-admin";

const day = (iso: string) => new Date(iso).toISOString().slice(0, 10);

/**
 * A server's own plan, read-only: which plan it is on, when it ends, and what it includes. A server on the free plan sees what a plan would add. How to get
 * a plan is placeholder text until the bot's owner decides (docs/PREMIUM-PLAN.md section 6). Shows nothing when the bot is older and doesn't say.
 */
export function PlanCard({ plan }: { plan: Pick<PremiumGuilds, "thisServer" | "thisServerPlan"> }) {
  const mine = plan.thisServerPlan;
  if (plan.thisServerPlan === undefined && !plan.thisServer) return null;

  return (
    <CollapsibleCard
      id="server-plan"
      title="Plan"
      hint={mine ? "What this server has." : "This server is on the free plan."}
      summary={<Chip tone={mine ? "good" : "plain"}>{mine ? mine.tier : "Free"}</Chip>}
      info="Some extras are for servers on a plan. They stay visible on their pages, marked Premium, and switch on when a plan is granted."
    >
      {mine ? (
        <div className="space-y-3 text-sm">
          <p>
            Plan: <strong>{mine.tier}</strong>. {mine.expiresAt ? `It runs through ${day(new Date(new Date(mine.expiresAt).getTime() - 86_400_000).toISOString())}.` : "It has no end date."}
          </p>
          <ul className="space-y-1.5">
            {mine.features.map((f) => (
              <li key={f.key}>
                <span className="font-medium">{f.title}</span>
                <span className="block text-xs text-muted">{f.description}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-muted">A plan adds faster player updates for your clan and a server avatar, banner and bio for JonnyBot. To ask about one, contact JonnyBot&apos;s owner. (This line will say how, once that is decided.)</p>
      )}
    </CollapsibleCard>
  );
}
