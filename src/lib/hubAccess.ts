import { cache } from "react";
import { canSeeJonnyBot } from "@/lib/jonnybotAccess";
import { switchOpen } from "@/lib/siteSwitches";
import { canEnter } from "@/lib/restrictedAccess";

/**
 * Whether the clans hub is open to everyone yet. Like JonnyBot's own site it starts closed: until the owner opens it (the hub switch in Super admin, or `HUB_PUBLIC=true`; `HUB_PUBLIC=false` keeps it shut) only the people who
 * may see JonnyBot's beta (the clan server's admins and developers, and the admin teams of trusted beta servers) get the hub, and
 * everyone else a "still in beta" page.
 */
export const hubOpen = (): Promise<boolean> => switchOpen("hub");

/** Whether this visitor may see the hub. Worked out once per request, since the layout and the page both ask. */
export const canSeeHub = cache(async (): Promise<boolean> => (await hubOpen()) || (await canSeeJonnyBot()));
export const canSeeHub = cache(async (): Promise<boolean> => hubOpen() || (await canEnter("hub")));
