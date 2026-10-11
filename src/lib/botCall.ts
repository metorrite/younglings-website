/**
 * Server-only caller for JonnyBot's internal API when the status code and body both matter (the public API and the plugin routes pass
 * the bot's answer through). Never import this from a Client Component: it carries the shared secret.
 *
 * Returns `null` when the bot isn't configured or can't be reached, so a route can answer "temporarily unavailable" instead of failing.
 */
export interface BotAnswer<T = unknown> {
  status: number;
  /** The parsed JSON body, or an empty object if it wasn't JSON. */
  json: T;
}

export async function botCall<T = unknown>(
  path: string,
  init: { method?: string; headers?: Record<string, string>; body?: string; revalidate?: number } = {},
): Promise<BotAnswer<T> | null> {
  const baseUrl = process.env.JONNYBOT_INTERNAL_API_URL;
  const secret = process.env.JONNYBOT_INTERNAL_API_SECRET;
  if (!baseUrl || !secret) return null;

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers: { "X-Internal-Secret": secret, ...(init.body ? { "Content-Type": "application/json" } : {}), ...init.headers },
      body: init.body,
      ...(init.revalidate !== undefined ? { next: { revalidate: init.revalidate } } : { cache: "no-store" as const }),
      signal: AbortSignal.timeout(8000),
    });
    let json: unknown = {};
    try {
      json = await response.json();
    } catch {
      // an empty or non-JSON body is treated as {}
    }
    return { status: response.status, json: json as T };
  } catch {
    return null;
  }
}
