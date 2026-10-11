import type { ReactNode } from "react";
import { JonnyBotFooter } from "@/components/jonnybot/JonnyBotFooter";
import { currentSite } from "@/lib/siteHostsServer";
import "./jonnybot.css";

/** The pages under /jonnybot are JonnyBot's own public site; its header comes from the root layout, the footer from here. */
export default async function JonnyBotLayout({ children }: { children: ReactNode }) {
  const site = await currentSite();
  return (
    <>
      {children}
      <JonnyBotFooter site={site} />
    </>
  );
}
