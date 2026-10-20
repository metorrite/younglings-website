/**
 * Where JonnyBot's users go for help: `JONNYBOT_SUPPORT_URL` (a Discord invite or any https page). Until it is set the JonnyBot
 * pages keep pointing people at the Younglings Discord, which is where help has always been given.
 */
export function supportUrl(): string | null {
  const raw = process.env.JONNYBOT_SUPPORT_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).protocol === "https:" ? raw : null;
  } catch {
    return null;
  }
}
