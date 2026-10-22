/**
 * Telling "JonnyBot can't be reached" apart from every other error on the error pages. In production an error thrown on the server reaches a client
 * error boundary with its message and class stripped; only `digest` survives, and Next keeps a digest the error already carries. So the one error
 * that really means "the bot didn't answer" carries a fixed digest, and the error pages check for it. No server-only imports: the error pages
 * (client components) and the node tests import this file.
 */
export const BOT_UNREACHABLE_DIGEST = "JONNYBOT_UNREACHABLE";

/** Thrown when an access check can't run because JonnyBot didn't answer (down, wrong secret): access fails closed, never granted by default. */
export class AdminUnavailableError extends Error {
  readonly digest = BOT_UNREACHABLE_DIGEST;

  constructor() {
    super("JonnyBot is unreachable, so admin access can't be verified.");
  }
}

/** Whether an error that reached an error page is the bot being unreachable (and not a bug in the page). */
export function isBotUnreachable(error: { digest?: string } | null | undefined): boolean {
  return error?.digest === BOT_UNREACHABLE_DIGEST;
}

/**
 * What an /admin or /dashboard error page says. "Can't reach JonnyBot" only when the bot really didn't answer; anything else is a fault in the page,
 * said plainly, with the error's digest as a reference a bug report can quote. `unreachableHint` ends the unreachable text (what to do next there).
 */
export function errorText(error: { digest?: string }, unreachableHint: string): { title: string; body: string; reference: string | null } {
  if (isBotUnreachable(error)) {
    return {
      title: "Can't reach JonnyBot",
      body: `The dashboard checks with the bot on every action, and it isn't answering right now, so nothing can be shown or changed. ${unreachableHint}`,
      reference: null,
    };
  }
  return {
    title: "Something broke",
    body: "This page hit an error while loading. It's a fault in the site, not in your settings, and nothing was changed. Try again; if it keeps happening, report it with the reference below.",
    reference: error.digest ?? null,
  };
}
