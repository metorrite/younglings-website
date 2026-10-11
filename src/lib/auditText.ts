/** Turns an API path into something a person reads: "PUT ticket/settings" → "Changed ticket settings". */
export function describe(method: string, path: string): string {
  const parts = path.split("/");
  const noun: Record<string, string> = {
    "ticket/settings": "ticket settings", "ticket/panels": "a ticket panel", selfroles: "self-assignable roles", news: "the news channels", community: "community settings",
    "clan/points": "clan points and ranks", post: "a channel message", polls: "a poll", signups: "a signup sheet", tracking: "a tracking channel", promotions: "a promotion", notes: "a member note", scheduled: "a scheduled post",
  };
  const key = parts.length >= 2 && noun[`${parts[0]}/${parts[1]}`] ? `${parts[0]}/${parts[1]}` : parts[0];
  const what = noun[key] ?? path;
  const verb = method === "DELETE" ? "Deleted" : method === "POST" ? (parts.at(-1) === "done" ? "Marked done:" : parts.at(-1) === "end" ? "Ended" : "Created or sent") : "Changed";
  return `${verb} ${what}`;
}
