"use client";

import { useState, useTransition } from "react";
import {
  FormField,
  formatUtc,
  inputClass,
  Notice,
  primaryButton,
} from "@/components/admin/ui";
import { Chip, CollapsibleCard } from "@/components/dashboard/ui/CollapsibleCard";
import { andList } from "@/components/dashboard/ui/andList";
import { FieldGrid, PanelGrid } from "@/components/dashboard/ui/Layout";
import { SettingRow } from "@/components/dashboard/ui/SettingRow";
import { Advanced, MoreInAdvanced, useViewMode } from "@/components/dashboard/ui/ViewMode";
import { ChannelSelect } from "@/components/admin/pickers";
import { PointsRewardsManager } from "@/components/dashboard/PointsRewardsManager";
import { PointsSubmissionsQueue } from "@/components/dashboard/PointsSubmissionsQueue";
import {
  choicesOf,
  type GuildStructure,
  type PointsOverview,
  type PointsRedemptions,
  type PointsRewards,
  type PointsSubmissions,
  type WelcomeActionResult,
} from "@/lib/jonnybot-admin";

export interface PointsActions {
  saveReward: (id: string | null, input: { name: string; description: string; cost: number; stock: number | null; active: boolean }) => Promise<WelcomeActionResult<PointsRewards>>;
  handleRedemption: (id: string, fulfil: boolean) => Promise<WelcomeActionResult<PointsRedemptions>>;
  decide: (id: string, input: { approve: boolean; points?: number; note?: string }) => Promise<WelcomeActionResult<PointsSubmissions>>;
  saveSettings: (input: { enabled: boolean; unit: string; reviewChannelId: string | null }) => Promise<WelcomeActionResult<PointsOverview>>;
  award: (input: { userId: string; points: number; reason: string }) => Promise<WelcomeActionResult<PointsOverview>>;
}

const CATEGORY: Record<string, string> = {
  MANUAL: "Awarded",
  EVENT: "Event",
  SUBMISSION: "Submission",
  DONATION: "Donation",
  REDEMPTION: "Reward",
  ADJUSTMENT: "Adjustment",
  KEYWORD: "Keyword",
};

function amount(n: number): string {
  return (n > 0 ? "+" : "") + n.toLocaleString("en-GB");
}

/**
 * A server's points, in the order you use them: the settings (open until points are switched on, then folded), the screenshots waiting for review, giving or taking
 * points beside the leaderboard, and the rewards. Basic is that; Advanced adds what the points are called, the totals and the latest history.
 */
export function PointsManager({
  initial,
  submissions,
  structure,
  rewards,
  redemptions,
  actions,
}: {
  initial: PointsOverview;
  submissions: PointsSubmissions;
  structure: GuildStructure;
  rewards: PointsRewards;
  redemptions: PointsRedemptions;
  actions: PointsActions;
}) {
  const [data, setData] = useState(initial);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [unit, setUnit] = useState(initial.unit);
  const [reviewChannel, setReviewChannel] = useState<string | null>(initial.reviewChannelId);
  const [userId, setUserId] = useState("");
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState<{ title: string; items: string[] } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [mode] = useViewMode();
  const advanced = mode === "advanced";

  // A decision elsewhere on the page refreshes the server data; follow it so the leaderboard and history stay current.
  const [seen, setSeen] = useState(initial);
  if (initial !== seen) {
    setSeen(initial);
    setData(initial);
  }

  const dirty = enabled !== data.enabled || unit.trim() !== data.unit || reviewChannel !== data.reviewChannelId;

  function saveSettings() {
    setProblem(null);
    setNote(null);
    start(async () => {
      const result = await actions.saveSettings({ enabled, unit: unit.trim(), reviewChannelId: reviewChannel });
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setData(result.data);
      setEnabled(result.data.enabled);
      setUnit(result.data.unit);
      setReviewChannel(result.data.reviewChannelId);
      setNote("Settings saved.");
    });
  }

  function award() {
    setProblem(null);
    setNote(null);
    const n = Number(points);
    if (!Number.isInteger(n) || n === 0)
      return setProblem({ title: "Enter a whole number of points, not zero. Use a negative number to take some back.", items: [] });
    start(async () => {
      const result = await actions.award({ userId, points: n, reason });
      if (!result.ok) return setProblem({ title: result.error, items: result.problems });
      setData(result.data);
      setPoints("");
      setReason("");
      setNote(n > 0 ? "Points given." : "Points taken back.");
    });
  }

  const totals = data.totals;
  const showUnit = advanced || data.unit !== "points";
  const hidden = [!showUnit && "what the points are called", !advanced && "the totals and the latest history"].filter((name): name is string => typeof name === "string");

  return (
    <div className="space-y-4">
      {problem && <Notice tone="error" title={problem.title} items={problem.items} />}
      {note && <Notice tone="success" title={note} />}

      <CollapsibleCard
        id="points-settings"
        title="Settings"
        hint="Members can check their balance with /points balance and see the leaderboard with /points top once this is on."
        defaultOpen={!initial.enabled}
        summary={
          <>
            <Chip tone={data.enabled ? "good" : "bad"}>{data.enabled ? "On" : "Off"}</Chip>
            <Chip tone={data.reviewChannelId ? "plain" : "warn"}>{data.reviewChannelId ? `Submissions to #${structure.channels.find((c) => c.id === data.reviewChannelId)?.name ?? "channel"}` : "No submissions"}</Chip>
          </>
        }
      >
        <SettingRow
          title="Use points in this server"
          hint="While off, the /points commands tell members it isn't switched on. Nothing already recorded is lost."
          checked={enabled}
          onChange={setEnabled}
          offHint="Off: nothing is recorded or shown to members. Everything already recorded is kept."
        >
          <FormField label="Review channel for screenshots" size="md" as="group" hint="Members run /points submit with a screenshot; it is posted here for your staff, then approved or denied below. Leave empty to turn submissions off.">
            <ChannelSelect
              {...choicesOf(structure)}
              onlyPostable
              allowForums={false}
              value={reviewChannel}
              onChange={setReviewChannel}
              none="No submissions"
            />
          </FormField>
          {showUnit && (
            <FormField label="What the points are called" size="sm" hint="For example points, tickets or coins.">
              <input className={inputClass} value={unit} maxLength={20} onChange={(e) => setUnit(e.target.value)} />
            </FormField>
          )}
        </SettingRow>
        <button type="button" className={primaryButton} disabled={pending || !dirty} onClick={saveSettings}>
          Save settings
        </button>
      </CollapsibleCard>

      <PointsSubmissionsQueue initial={submissions} unit={data.unit} decide={actions.decide} />

      <PanelGrid min="24rem">
        <CollapsibleCard
          id="points-award"
          title="Give or take points"
          hint={`One entry can move up to ${data.maxPerEntry.toLocaleString("en-GB")}. A reason is required and stays in the history. Taking points back can't take someone below zero.`}
          defaultOpen
        >
          <FieldGrid>
            <FormField label="Member's Discord user ID" size="md" hint="Right-click them with Developer Mode on, then Copy User ID. Or use a name's Award button on the leaderboard.">
              <input className={inputClass} value={userId} inputMode="numeric" placeholder="e.g. 231145573753815040" onChange={(e) => setUserId(e.target.value)} />
            </FormField>
            <FormField label="Amount" size="sm" hint="Negative takes back.">
              <input className={inputClass} value={points} inputMode="numeric" placeholder="50" onChange={(e) => setPoints(e.target.value)} />
            </FormField>
          </FieldGrid>
          <FormField label="Reason" size="lg">
            <input className={inputClass} value={reason} maxLength={200} placeholder="Hosted the Friday raid" onChange={(e) => setReason(e.target.value)} />
          </FormField>
          <button type="button" className={primaryButton} disabled={pending || !userId.trim() || !points.trim() || !reason.trim()} onClick={award}>
            Record it
          </button>
        </CollapsibleCard>

        <CollapsibleCard
          id="points-leaderboard"
          title="Leaderboard"
          hint="Who has the most."
          defaultOpen
          summary={<Chip>{totals.members === 0 ? "Nobody yet" : `${totals.members.toLocaleString("en-GB")} members with ${data.unit}`}</Chip>}
        >
          {data.top.length === 0 ? (
            <p className="text-sm text-muted">Nobody has any {data.unit} yet.</p>
          ) : (
            <ol className="space-y-2">
              {data.top.map((row, i) => (
                <li key={row.userId} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">
                    <span className="mr-2 w-6 text-right text-xs text-muted tabular-nums">{i + 1}.</span>
                    {row.userName ?? "Someone who left"}
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="font-medium tabular-nums">{row.points.toLocaleString("en-GB")}</span>
                    <button type="button" className="inline-flex min-h-6 items-center text-xs text-gold underline" onClick={() => setUserId(row.userId)}>
                      Award
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CollapsibleCard>
      </PanelGrid>

      <PointsRewardsManager
        rewards={rewards}
        redemptions={redemptions}
        unit={data.unit}
        save={actions.saveReward}
        handle={actions.handleRedemption}
      />

      <Advanced>
        <PanelGrid min="9rem" gap="gap-3">
          {[
            ["Members with points", totals.members],
            ["In circulation", totals.outstanding],
            ["Ever given", totals.awarded],
            ["Spent or taken back", totals.spent],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-xl border border-surface-border bg-surface p-4">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{(value as number).toLocaleString("en-GB")}</p>
            </div>
          ))}
        </PanelGrid>

        <CollapsibleCard id="points-history" title="Latest history" hint="Every change, newest first, with its reason." defaultOpen summary={<Chip>{data.recent.length} entries</Chip>}>
          {data.recent.length === 0 ? (
            <p className="text-sm text-muted">Nothing has been recorded yet.</p>
          ) : (
            <ul className="divide-y divide-surface-border">
              {data.recent.map((e) => (
                <li key={e.id} className="py-2 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate font-medium">{e.userName ?? "Someone who left"}</span>
                    <span className={`font-semibold tabular-nums ${e.points < 0 ? "text-red-400" : "text-emerald-400"}`}>{amount(e.points)}</span>
                  </div>
                  <p className="break-words text-muted">{e.reason}</p>
                  <p className="text-xs text-muted">
                    {CATEGORY[e.category] ?? e.category}
                    {e.awardedByName ? ` by ${e.awardedByName}` : ""} · {formatUtc(e.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleCard>
      </Advanced>

      {hidden.length > 0 && <MoreInAdvanced>{andList(hidden)}.</MoreInAdvanced>}
    </div>
  );
}
