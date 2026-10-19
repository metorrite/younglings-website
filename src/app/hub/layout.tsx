import type { ReactNode } from "react";

/** Wraps every page of the clans hub: as wide as the screen allows (a directory should use the room), over a soft glow, with a small footer. */
export default function HubLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(60%_60%_at_20%_0%,rgba(212,175,55,0.13),transparent),radial-gradient(50%_55%_at_90%_5%,rgba(99,102,241,0.10),transparent)]" />
      <div className="relative mx-auto w-full max-w-[96rem] px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        {children}
        <footer className="mt-20 border-t border-surface-border pt-6 text-xs text-muted">
          <p>
            Clans choose what is shown here. Listings are checked against the in-game clan before they get a Verified tick. Powered by JonnyBot. A listing that breaks the rules can be reported from its page.
          </p>
        </footer>
      </div>
    </div>
  );
}
