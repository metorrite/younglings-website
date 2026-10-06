"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { HUB_TABS } from "@/lib/nav";

/**
 * The persistent header of the primary pages — Home, Members, Stats, Events and Recaps. It stays mounted while
 * you move between them, so only the content underneath changes: the big welcome shrinks to a slim bar when you
 * leave Home, the buttons slide between selected and unselected colours, and each new page fades in.
 */
export function HubShell({ clanName, children }: { clanName: string; children: ReactNode }) {
  const pathname = usePathname();
  const home = pathname === "/";
  const Title = home ? "h1" : "p"; // only the page itself gets to be the h1 when you're not on Home

  return (
    <div className="relative">
      <div className={`pointer-events-none absolute inset-x-0 top-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.14),transparent_65%)] transition-[height] duration-700 ${home ? "h-[26rem]" : "h-48"}`} />

      <header className={`relative mx-auto flex max-w-[96rem] flex-col items-center px-4 transition-[padding] duration-500 sm:px-6 ${home ? "pt-10" : "pt-5"}`}>
        <div className={`flex items-center transition-all duration-500 ${home ? "flex-col gap-4" : "flex-row gap-3"}`}>
          <Image
            src="/clan-logo.png"
            alt="Younglings"
            width={88}
            height={88}
            className={`rounded-full ring-2 ring-gold/50 transition-all duration-500 ${home ? "h-[88px] w-[88px] shadow-[0_0_40px_rgba(212,175,55,0.25)]" : "h-9 w-9"}`}
          />
          <div className="text-center">
            <p className={`overflow-hidden text-xs tracking-[0.3em] text-muted uppercase transition-all duration-500 ${home ? "max-h-6 opacity-100" : "max-h-0 opacity-0"}`}>Welcome to</p>
            <Title className={`font-bold tracking-wide text-gold transition-all duration-500 ${home ? "text-4xl sm:text-5xl" : "text-xl"}`}>{clanName}</Title>
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap justify-center gap-2 text-sm" aria-label="Primary sections">
          {HUB_TABS.map((tab) => {
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-md border px-4 py-2 font-medium transition-colors duration-300 ${
                  active ? "border-gold bg-gold text-background" : "border-surface-border bg-transparent text-foreground hover:border-gold/50"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Keyed by the page, so every navigation replays the fade-in; the header above never remounts. */}
      <div key={pathname} className="hub-in relative">
        {children}
      </div>
    </div>
  );
}
