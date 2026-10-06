"use client";

import { signIn, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OPEN_LINK_EVENT } from "@/components/link/LinkModalHost";
import type { LinkState } from "@/lib/site";

type Item = { href: string; label: string; icon: string };

// The profile's own tabs, in the order they appear left to right on the profile page.
const SERVER = { href: "/profile?tab=server", label: "Server profile", icon: "🎭" };
const MEMBER_PAGE = { href: "/profile?tab=public", label: "Member page", icon: "🪪" };
const GOALS = { href: "/profile?tab=goals", label: "Goals", icon: "🎯" };
const ACTIVITY = { href: "/profile?tab=activity", label: "My activity", icon: "📋" };
const COFFER = { href: "/profile?tab=coffer", label: "Coffer", icon: "💰" };
const NOTIFICATIONS = { href: "/profile?tab=notifications", label: "Notifications", icon: "🔔" };

/** Tabs that work for anyone signed in, and the extra ones that need a linked RuneScape name. */
const ANYONE: Item[] = [SERVER, ACTIVITY, NOTIFICATIONS];
const LINKED: Item[] = [SERVER, MEMBER_PAGE, GOALS, ACTIVITY, COFFER, NOTIFICATIONS];

const BADGE = {
  NONE: { color: "#ef4444", label: "Your RuneScape name isn't linked yet" },
  PENDING: { color: "#facc15", label: "Your link request is being reviewed" },
} as const;

/** A warning triangle with an exclamation mark, drawn over the corner of the avatar. */
function StatusBadge({ state }: { state: "NONE" | "PENDING" }) {
  const { color, label } = BADGE[state];
  return (
    <span className="absolute -right-1 -bottom-1 flex h-4 w-4 items-center justify-center" title={label}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden className="drop-shadow-[0_0_2px_rgba(0,0,0,0.9)]">
        <path d="M12 2.5 22.5 21h-21z" fill={color} stroke="#0b0d12" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 9v5.5" stroke="#0b0d12" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="12" cy="17.6" r="1.2" fill="#0b0d12" />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

/**
 * Signed in: the avatar and name. Clicking them goes to your profile overview; hovering (or tapping, on a touch screen)
 * opens a menu of the profile's tabs. Someone without a linked RuneScape name sees only what applies to them, plus
 * a way to link one, and a warning badge on the avatar until it is. Signed out: the Discord login button.
 */
export function ProfileMenu({ user, isAdmin, link }: { user: { name: string; image: string | null } | null; isAdmin: boolean; link: { state: LinkState["state"]; pendingRsn: string | null } | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [seenPath, setSeenPath] = useState(pathname);
  const root = useRef<HTMLDivElement>(null);
  const pointer = useRef("mouse");

  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => signIn("discord")}
        className="flex items-center gap-2 rounded-md bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4752c4]"
      >
        <span aria-hidden>⚔️</span>
        Login with Discord
      </button>
    );
  }

  const state = link?.state ?? "LINKED"; // if the bot can't be asked, show the full menu rather than a false warning
  const linked = state === "LINKED";
  const tabs = linked ? LINKED : ANYONE;
  const itemClass = "flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition hover:bg-white/5";

  return (
    <div ref={root} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <Link
        href="/profile"
        aria-haspopup="menu"
        aria-expanded={open}
        onPointerDown={(e) => {
          pointer.current = e.pointerType;
        }}
        onClick={(e) => {
          // With a mouse a click goes to the profile overview. A finger can't hover, so its first tap opens the menu instead.
          if (pointer.current !== "mouse" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex items-center gap-2 rounded-full py-1 pr-3 pl-1 transition ${open ? "bg-white/10" : "hover:bg-white/5"}`}
      >
        <span className="relative">
          {user.image ? (
            <Image src={user.image} alt="" width={32} height={32} className={`rounded-full ring-2 transition ${open ? "ring-gold" : "ring-white/10"}`} />
          ) : (
            <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold ring-2 transition ${open ? "ring-gold" : "ring-white/10"}`}>{user.name.charAt(0)}</span>
          )}
          {state !== "LINKED" && <StatusBadge state={state} />}
        </span>
        <span className="hidden max-w-28 truncate text-sm font-medium sm:block">{user.name}</span>
        <span className="text-[10px] text-muted">▾</span>
      </Link>

      {open && (
        <div className="nav-pop absolute top-full right-0 z-50 w-60 pt-2">
          <ul role="menu" className="overflow-hidden rounded-xl border border-surface-border bg-surface py-1 shadow-2xl">
            <li role="none">
              <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className="block border-b border-surface-border px-4 py-2.5 transition hover:bg-white/5">
                <span className="flex items-center gap-3">
                  <span aria-hidden className="w-5 text-center">🏠</span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">Profile overview</span>
                    <span className="block truncate text-xs text-muted">{user.name}</span>
                  </span>
                </span>
              </Link>
            </li>

            <li role="none" className="py-1">
              {tabs.map((item) => (
                <Link key={item.href} role="menuitem" href={item.href} onClick={() => setOpen(false)} className={itemClass}>
                  <span aria-hidden className="w-5 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </li>

            {!linked && (
              <li role="none" className="border-t border-surface-border py-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    window.dispatchEvent(new Event(OPEN_LINK_EVENT));
                  }}
                  className={`${itemClass} ${state === "NONE" ? "text-red-300 hover:bg-red-500/10" : "text-yellow-300 hover:bg-yellow-500/10"}`}
                >
                  <span aria-hidden className="w-5 text-center">{state === "NONE" ? "🔗" : "⏳"}</span>
                  <span className="min-w-0">
                    <span className="block">{state === "NONE" ? "Link your RuneScape name" : "Link request: in review"}</span>
                    {state === "PENDING" && link?.pendingRsn && <span className="block truncate text-xs opacity-80">{link.pendingRsn} · view status</span>}
                  </span>
                </button>
              </li>
            )}

            {linked && (
              <li role="none" className="border-t border-surface-border py-1">
                <Link role="menuitem" href="/recap/me" onClick={() => setOpen(false)} className={itemClass}>
                  <span aria-hidden className="w-5 text-center">✨</span>
                  My recap
                </Link>
                <Link role="menuitem" href="/profile/public" onClick={() => setOpen(false)} className={itemClass}>
                  <span aria-hidden className="w-5 text-center">👁️</span>
                  View my public page
                </Link>
              </li>
            )}

            {isAdmin && (
              <li role="none" className="border-t border-surface-border">
                <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm text-gold transition hover:bg-gold/10">
                  <span aria-hidden className="w-5 text-center">🛡️</span>
                  Admin dashboard
                </Link>
              </li>
            )}
            <li role="none" className="border-t border-surface-border">
              <button type="button" role="menuitem" onClick={() => signOut({ callbackUrl: "/" })} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-muted transition hover:bg-white/5 hover:text-foreground">
                <span aria-hidden className="w-5 text-center">↩</span>
                Log out
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
