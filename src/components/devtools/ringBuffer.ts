import type { RingEntry } from "@/lib/siteSnapshot";

/**
 * The small log the dev snapshot carries: the last 50 console errors, script errors and failed requests since the page opened. Installed only by the owner's
 * button (never for anyone else), and it keeps text only: a failed request is recorded as method, path and status, with no query, headers, body or cookies.
 */

const MAX = 50;
const entries: RingEntry[] = [];
let installed = false;

function push(kind: RingEntry["kind"], message: string) {
  entries.push({ at: new Date().toISOString(), kind, message: message.slice(0, 500) });
  if (entries.length > MAX) entries.shift();
}

function describe(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function pathOf(input: RequestInfo | URL): string {
  try {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.href);
    return url.origin === window.location.origin ? url.pathname : `${url.origin}${url.pathname}`;
  } catch {
    return "?";
  }
}

export function installRingBuffer(): () => void {
  if (installed) return () => {};
  installed = true;

  const originalError = console.error;
  const originalFetch = window.fetch;

  console.error = (...args: unknown[]) => {
    push("console", args.map(describe).join(" "));
    originalError.apply(console, args);
  };
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const method = (init?.method ?? (typeof input === "object" && "method" in input ? input.method : "GET")).toUpperCase();
    try {
      const response = await originalFetch(input, init);
      if (!response.ok) push("fetch", `${method} ${pathOf(input)} -> ${response.status}`);
      return response;
    } catch (error) {
      push("fetch", `${method} ${pathOf(input)} failed: ${describe(error)}`);
      throw error;
    }
  };
  const onError = (event: ErrorEvent) => push("error", `${event.message} (${event.filename ? new URL(event.filename, window.location.href).pathname : "?"}:${event.lineno})`);
  const onRejection = (event: PromiseRejectionEvent) => push("error", `Unhandled rejection: ${describe(event.reason)}`);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    console.error = originalError;
    window.fetch = originalFetch;
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    installed = false;
  };
}

export function ringSnapshot(): RingEntry[] {
  return entries.slice(-MAX);
}
