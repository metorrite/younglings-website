import { redirect } from "next/navigation";

/** Announcements moved onto Post a message (T-215); old links and bookmarks land there with their query string. */
export default async function AnnouncementsPage({ params, searchParams }: { params: Promise<{ guildId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { guildId } = await params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, v);
  }
  const qs = query.toString();
  redirect(`/dashboard/${encodeURIComponent(guildId)}/post${qs ? `?${qs}` : ""}`);
}
