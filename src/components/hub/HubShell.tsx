"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOptimistic, useTransition, type MouseEvent, type ReactNode } from "react";
import { HUB_TABS } from "@/lib/nav";

/**
 * The persistent header of the primary pages — Home, Members, Stats, Events and Recaps. It stays mounted while
 * you move between them. Clicking a button highlights it and resizes the welcome straight away, the page you're
 * leaving dims while the next one loads (instead of being swapped for a skeleton), and the new page fades in.
 */
export function HubShell({ clanName, children }: { clanName: string; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startNavigation] = useTransition();
  // Reflects the page being navigated to as soon as a button is pressed, then settles on the real path.
  const [target, setTarget] = useOptimistic(pathname);
  const home = target === "/";
  const Title = home ? "h1" : "p"; // only the page itself gets to be the h1 when you're not on Home

  function go(e: MouseEvent<HTMLAnchorElement>, href: string) {
    // Let new-tab clicks and the like behave normally.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (href === pathname) return;
    startNavigation(() => {
      setTarget(href);
      router.push(href);
    });
  }

  // The logo and caption shrink away (height, size and opacity together) rather than being clipped, so the logo's glow can spill past its box.
  const fold = (open: boolean) => `origin-top transition-[height,opacity,transform] duration-500 ease-out ${open ? "h-[8.5rem] scale-100 opacity-100" : "pointer-events-none h-0 scale-75 opacity-0"}`;

  return (
    <div className="relative">
      <div className={`pointer-events-none absolute inset-x-0 top-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.14),transparent_65%)] transition-[height] duration-700 ease-out ${home ? "h-[26rem]" : "h-48"}`} />

      <header className={`relative mx-auto flex max-w-[96rem] flex-col items-center px-4 transition-[padding] duration-500 ease-out sm:px-6 ${home ? "pt-10" : "pt-5"}`}>
        <div className={fold(home)} aria-hidden={!home}>
          <div className="flex flex-col items-center gap-3">
            <Image src="/clan-logo.png" alt="Younglings" width={88} height={88} className="h-[88px] w-[88px] rounded-full shadow-[0_0_40px_rgba(212,175,55,0.25)] ring-2 ring-gold/50" />
            <p className="text-xs tracking-[0.3em] text-muted uppercase">Welcome to</p>
          </div>
        </div>

        <Title className={`text-center font-bold tracking-wide text-gold transition-[font-size,line-height] duration-500 ease-out ${home ? "text-4xl leading-10 sm:text-5xl sm:leading-[3rem]" : "text-xl leading-7"}`}>{clanName}</Title>

        <nav className="mt-4 flex flex-wrap justify-center gap-2 text-sm" aria-label="Primary sections">
          {HUB_TABS.map((tab) => {
            const active = tab.match(target);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={(e) => go(e, tab.href)}
                aria-current={active ? "page" : undefined}
                className={`rounded-md border px-4 py-2 font-medium transition-[background-color,border-color,color,box-shadow] duration-300 ease-out ${
                  active ? "border-gold bg-gold text-background shadow-[0_0_18px_rgba(212,175,55,0.25)]" : "border-surface-border bg-transparent text-foreground hover:border-gold/50"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </header>

      {/* Keyed by the page, so each arrival replays the fade-in; the header above never remounts. */}
      <div key={pathname} className={`hub-in relative transition-opacity duration-200 ${pending ? "opacity-[0.35]" : "opacity-100"}`} aria-busy={pending}>
        {children}
      </div>
    </div>
  );
}
