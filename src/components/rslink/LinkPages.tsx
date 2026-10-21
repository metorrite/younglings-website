"use client";

import { CodeEntry } from "./CodeEntry";
import { ConfirmLink } from "./ConfirmLink";
import { MyLinks } from "./MyLinks";
import { realLinkApi } from "./linkApi";

/** The three RS Link screens wired to the real routes (the preview harness wires the same components to made-up answers). */
export function CodeEntryPage({ initialCode, signInError }: { initialCode?: string; signInError?: string }) {
  return <CodeEntry api={realLinkApi} initialCode={initialCode} signInError={signInError} />;
}

export function ConfirmPage({ base }: { base: string }) {
  return <ConfirmLink api={realLinkApi} base={base} />;
}

export function MyLinksPage({ base }: { base: string }) {
  return <MyLinks api={realLinkApi} base={base} />;
}
