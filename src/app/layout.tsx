import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";
import { Navbar } from "@/components/Navbar";
import { LinkModalGate } from "@/components/link/LinkModalGate";
import { DialogProvider } from "@/components/ui/Dialogs";
import { JonnyBotNavbar } from "@/components/jonnybot/JonnyBotNavbar";
import { ClansNavbar } from "@/components/clanshub/ClansNavbar";
import { DevSnapshotMount } from "@/components/devtools/DevSnapshotMount";
import { hubOpen } from "@/lib/hubAccess";
import { publicSiteOpen } from "@/lib/jonnybotAccess";
import { currentSite } from "@/lib/siteHostsServer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Which face of the site this is (the clan site or JonnyBot's) decides the title and the header, so the metadata is worked out per request.
export async function generateMetadata(): Promise<Metadata> {
  const site = await currentSite();
  if (site.link) {
    // The neutral RS Link face: its own name, no clan or JonnyBot branding, and not for search engines until it is released (T-120).
    return { title: { default: "RS Link", template: "%s | RS Link" }, description: "Link your RuneScape name to your Discord account.", robots: { index: false, follow: false } };
  }
  // A hosted clan site (website builder) names itself in its own layout; the builder is in beta, so no search engines yet.
  if (site.tenant) return { robots: { index: false, follow: false } };
  if (site.hub) {
    return {
      metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
      title: { default: "Clans Hub", template: "%s | Clans Hub" },
      description: "Find a RuneScape 3 clan: who is recruiting, what they do and what they have coming up.",
      // closed to search engines until the hub is opened
      ...((await hubOpen()) ? {} : { robots: { index: false, follow: false } }),
    };
  }
  if (site.jonnybot) {
    return {
      metadataBase: new URL(site.split ? site.jonnybotOrigin : (process.env.NEXTAUTH_URL ?? "http://localhost:3000")),
      title: { default: "JonnyBot", template: "%s | JonnyBot" },
      description: "A Discord bot for RuneScape 3 clans and communities.",
      // closed until the site is opened: not for search engines yet
      ...((await publicSiteOpen()) ? {} : { robots: { index: false, follow: false } }),
    };
  }
  return {
    // Link-preview images (Discord, social) need absolute URLs, so they're resolved against the site's real address.
    metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
    title: "Younglings",
    description: "The Younglings clan hub.",
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const site = await currentSite();
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SessionProviderWrapper>
          <DialogProvider>
          {site.tenant ? (
            // A clan's own website: its template draws the header and footer; none of the Younglings site's chrome.
            children
          ) : (
            <>
              {site.link ? null : site.hub ? <ClansNavbar site={site} /> : site.jonnybot ? <JonnyBotNavbar site={site} /> : <Navbar site={site} />}
              <main className="flex-1">{children}</main>
              {!site.jonnybot && !site.hub && !site.link && <LinkModalGate />}
              {!site.link && <DevSnapshotMount site={site} />}
            </>
          )}
          </DialogProvider>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
