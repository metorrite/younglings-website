import { CodeEntryPage } from "@/components/rslink/LinkPages";

export const metadata = { title: { absolute: "RS Link: link your RuneScape name to Discord" } };

/** The address players type from the game: enter the code. `?code=` pre-fills it (for a phone photo of the screen). */
export default async function LinkHome({ searchParams }: { searchParams: Promise<{ code?: string; error?: string }> }) {
  const q = await searchParams;
  const code = typeof q.code === "string" ? q.code.replace(/[^A-Za-z0-9-]/g, "").slice(0, 9) : "";
  const error = typeof q.error === "string" ? q.error.slice(0, 32) : undefined;
  return <CodeEntryPage initialCode={code} signInError={error} />;
}
