import { LinkPanel } from "@/components/rslink/LinkShell";

export const metadata = { title: "Privacy" };

/**
 * The privacy text (LINK-SYSTEM.md section 14). It must say exactly what the code does; change both together. How long backups keep data
 * is added at release, once hosting is chosen (T-120).
 */
export default function LinkPrivacy() {
  return (
    <LinkPanel>
      <h1 className="text-xl font-semibold">Privacy</h1>
      <div className="mt-4 space-y-3 text-sm text-muted">
        <p>
          We store your RuneScape name (and the plugin&apos;s tracking number, if you allowed it) and your Discord account id and username. Both are
          encrypted, sign-in tokens are stored only as fingerprints, and we never see your Discord password or email. Plugins that use this link
          only see whether you are linked and a code that is different for every plugin; they never see your Discord account. You can unlink or
          delete everything at any time on the My links page.
        </p>
        <h2 className="pt-2 font-semibold text-foreground">What Discord tells us</h2>
        <p>Signing in asks Discord for your user id and username only (the &ldquo;identify&rdquo; permission). We use it once to see who you are and then throw Discord&apos;s sign-in away.</p>
        <h2 className="pt-2 font-semibold text-foreground">How long we keep things</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>A link stays until you unlink it or delete your data. A PC whose plugin hasn&apos;t used the link for a year is signed out.</li>
          <li>Ended links are kept 30 days so you can see them here, then deleted.</li>
          <li>Codes last 10 minutes; unfinished requests are deleted after a day.</li>
          <li>Records of failed tries (kept to stop abuse) are deleted after 30 days. They hold fingerprints, never codes or your address in plain text.</li>
        </ul>
        <h2 className="pt-2 font-semibold text-foreground">Cookies</h2>
        <p>This page sets one cookie, only to keep you signed in for up to an hour while you link. No tracking, no ads, no analytics.</p>
        <p className="pt-2 text-xs">RS Link is a free community plugin. It is not affiliated with Jagex or Discord.</p>
      </div>
    </LinkPanel>
  );
}
