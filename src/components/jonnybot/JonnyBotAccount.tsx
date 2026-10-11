"use client";

import { signIn, signOut } from "next-auth/react";

/** The sign-in button, or who is signed in with a sign-out button, for JonnyBot's own header. */
export function JonnyBotAccount({ user, signInTo, signOutTo }: { user: { name: string; image: string | null } | null; signInTo: string; signOutTo: string }) {
  if (!user) {
    return (
      <button type="button" onClick={() => signIn("discord", { callbackUrl: signInTo })} className="rounded-md bg-[#5865F2] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[#4752c4]">
        Login with Discord
      </button>
    );
  }
  return (
    <div className="flex items-center gap-2">
      {user.image && (
        // eslint-disable-next-line @next/next/no-img-element -- a Discord avatar from its CDN
        <img src={user.image} alt="" width={28} height={28} className="h-7 w-7 rounded-full" />
      )}
      <span className="hidden max-w-32 truncate text-sm sm:inline">{user.name}</span>
      <button type="button" onClick={() => signOut({ callbackUrl: signOutTo })} className="rounded-md border border-surface-border px-2.5 py-1 text-xs text-muted transition hover:text-foreground">
        Sign out
      </button>
    </div>
  );
}
