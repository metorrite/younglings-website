import type { ReactNode } from "react";

/** Wraps every page of the clans hub: a centred column and a small footer. */
export default function HubLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      {children}
      <footer className="mt-16 border-t border-surface-border pt-6 text-xs text-muted">
        <p>
          Clans choose what is shown here. Listings are checked against the in-game clan before they get a Verified tick. Powered by JonnyBot. A listing that breaks the rules can be reported from its page.
        </p>
      </footer>
    </div>
  );
}
