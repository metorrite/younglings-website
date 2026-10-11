import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";
import { Navbar } from "@/components/Navbar";
import { LinkModalGate } from "@/components/link/LinkModalGate";
import { JonnyBotNavbar } from "@/components/jonnybot/JonnyBotNavbar";
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
  if (site.jonnybot) {
    return {
      metadataBase: new URL(site.split ? site.jonnybotOrigin : (process.env.NEXTAUTH_URL ?? "http://localhost:3000")),
      title: { default: "JonnyBot", template: "%s | JonnyBot" },
      description: "A Discord bot for RuneScape 3 clans and communities.",
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
          {site.jonnybot ? <JonnyBotNavbar site={site} /> : <Navbar site={site} />}
          <main className="flex-1">{children}</main>
          {!site.jonnybot && <LinkModalGate />}
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
