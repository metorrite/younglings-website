import { cache } from "react";
import { canEnter } from "@/lib/restrictedAccess";

/**
 * Whether the clans hub is open to everyone yet. Like JonnyBot's own site it starts closed: until `HUB_PUBLIC=true` only the people who
 * may see JonnyBot's beta (the clan server's admins and developers, and the admin teams of trusted beta servers) get the hub, and
 * everyone else a "still in beta" page.
 */
export const hubOpen = (): boolean => process.env.HUB_PUBLIC === "true";

/** Whether this visitor may see the hub. Worked out once per request, since the layout and the page both ask. */
export const canSeeHub = cache(async (): Promise<boolean> => hubOpen() || (await canEnter("hub")));
