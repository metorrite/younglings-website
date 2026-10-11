"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { LoginButton } from "@/components/auth/LoginButton";
import { authError } from "@/lib/authErrors";

/** What the downloadable file says: facts for troubleshooting, and nothing private (no cookies, tokens or codes). */
function report(code: string, rawError: string | null): string {
  const info = authError(code);
  const now = new Date();
  const lines = [
    "Younglings / JonnyBot sign-in problem report",
    "=============================================",
    `Time (UTC):   ${now.toISOString()}`,
    `Time (local): ${now.toString()}`,
    `Error code:   ${rawError ?? code}`,
    `Meaning:      ${info.title} - ${info.what}`,
    "",
    `Site:         ${location.host}`,
    `Page:         ${location.pathname}${location.search}`,
    `Came from:    ${document.referrer || "(nothing)"}`,
    `Browser:      ${navigator.userAgent}`,
    `Language:     ${navigator.language}`,
    `Time zone:    ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
    `Cookies on:   ${navigator.cookieEnabled}`,
    `Online:       ${navigator.onLine}`,
    "",
    "Please send this file to the site's admin. It holds no passwords, cookies or sign-in codes.",
  ];
  return lines.join("\r\n");
}

export function SignInPanel({ code, rawError, callbackUrl }: { code: string | null; rawError: string | null; callbackUrl: string }) {
  const [busy, setBusy] = useState(false);
  const info = code ? authError(code) : null;

  function download() {
    const blob = new Blob([report(code ?? "Default", rawError)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `signin-problem-${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="rounded-xl border border-surface-border bg-surface p-6 sm:p-8">
        {info ? (
          <>
            <div className="flex items-start gap-3">
              <span aria-hidden className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                !
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{info.title}</h1>
                <p className="mt-1 text-muted">{info.what}</p>
              </div>
            </div>
            <div className="mt-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">What you can do</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
                {info.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
            <p className="mt-1 text-muted">Sign in with your Discord account. We only ask who you are: your name and avatar.</p>
          </>
        )}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <LoginButton
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void signIn("discord", { callbackUrl });
            }}
          >
            {busy ? "Opening Discord…" : info ? "Try again with Discord" : "Login with Discord"}
          </LoginButton>
          <Link href="/" className="rounded-md border border-surface-border px-5 py-2.5 text-sm font-semibold transition hover:border-gold">
            Back to the home page
          </Link>
        </div>

        {info && (
          <div className="mt-8 border-t border-surface-border pt-5 text-sm">
            <p className="text-muted">Still stuck? Download a small file about this problem and send it to the site&apos;s admin. It has no passwords or sign-in codes in it.</p>
            <button type="button" onClick={download} className="mt-3 rounded-md border border-surface-border px-4 py-2 font-semibold transition hover:border-gold">
              Download troubleshooting file (.txt)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
