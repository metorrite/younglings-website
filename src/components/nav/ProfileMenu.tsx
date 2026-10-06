"use client";

import { signIn, signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const ITEMS = [
  { href: "/profile/public", label: "My public profile", icon: "🪪" },
  { href: "/recap/me", label: "My recap", icon: "✨" },
  { href: "/profile?tab=activity", label: "My activity", icon: "📋" },
  { href: "/profile?tab=goals", label: "Goals", icon: "🎯" },
  { href: "/profile?tab=coffer", label: "Coffer", icon: "💰" },
  { href: "/profile?tab=public", label: "Settings", icon: "⚙️" },
];

/** Signed in: the avatar, with a menu of quick links and Log out (opens on hover or click). Signed out: the Discord login button. */
export function ProfileMenu({ user, isAdmin }: { user: { name: string; image: string | null } | null; isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [seenPath, setSeenPath] = useState(pathname);
  const root = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={root} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-full py-1 pr-3 pl-1 transition ${open ? "bg-white/10" : "hover:bg-white/5"}`}
      >
        {user.image ? (
          <Image src={user.image} alt="" width={32} height={32} className={`rounded-full ring-2 transition ${open ? "ring-gold" : "ring-white/10"}`} />
        ) : (
          <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-sm font-bold text-gold ring-2 transition ${open ? "ring-gold" : "ring-white/10"}`}>{user.name.charAt(0)}</span>
        )}
        <span className="hidden max-w-28 truncate text-sm font-medium sm:block">{user.name}</span>
        <span className="text-[10px] text-muted">▾</span>
      </button>

      {open && (
        <div className="nav-pop absolute top-full right-0 z-50 w-56 pt-2">
          <ul role="menu" className="overflow-hidden rounded-xl border border-surface-border bg-surface py-1 shadow-2xl">
            <li className="border-b border-surface-border px-4 py-2.5">
              <p className="truncate text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-muted">Signed in with Discord</p>
            </li>
            {ITEMS.map((item) => (
              <li key={item.href} role="none">
                <Link role="menuitem" href={item.href} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm transition hover:bg-white/5">
                  <span aria-hidden className="w-5 text-center">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            ))}
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
