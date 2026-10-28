import { notFound } from "next/navigation";
import type { ReactNode } from "react";

/**
 * The preview harness: dashboard pieces rendered with made-up data so a layout can be looked at without signing in or running the bot
 * (`/dev-preview?v=<view>&mode=basic|advanced`). It exists only while developing; a production build answers 404.
 */
export default function DevPreviewLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
