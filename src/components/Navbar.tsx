import Image from "next/image";
import Link from "next/link";
import { LoginButton } from "./LoginButton";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/members", label: "Members" },
  { href: "/events", label: "Events" },
];

export function Navbar() {
  return (
    <header className="border-b border-surface-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/clan-logo.png" alt="Younglings" width={32} height={32} className="rounded-full" />
          <span className="font-semibold tracking-wide text-gold">YOUNGLINGS</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <LoginButton />
      </div>
    </header>
  );
}
