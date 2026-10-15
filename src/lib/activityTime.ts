const FORMAT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" });

/**
 * When an adventure-log entry happened, in game time (UTC). RuneMetrics writes the time as UK local time, which is an hour ahead of UTC in summer, so the
 * bot converts it to the real moment (`occurredAt`); the raw text is only used if that is missing.
 */
export function activityWhen(occurredAt: string | null | undefined, raw: string): string {
  if (!occurredAt) return raw;
  const at = new Date(occurredAt);
  return Number.isNaN(at.getTime()) ? raw : `${FORMAT.format(at)} UTC`;
}
