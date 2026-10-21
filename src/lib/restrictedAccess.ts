import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { whoAmI } from "@/lib/jonnybot-admin";
import { areaAllowed, type RestrictedArea } from "@/lib/restrictedRule";

/**
 * The one check every restricted area uses while it is closed to the public: may the signed-in visitor enter this area? The bot decides, from the
 * beta rule (the clan's admins and the trusted beta servers' admins) or the owner's access list (a user, or a server plus a permission level).
 * Worked out once per request per area, since the header, the layout and the page all ask. Not signed in, or a bot that cannot be asked, is no.
 * It only lifts the gate on the area; it never gives admin rights anywhere (every dashboard server is still checked on its own).
 */
export const canEnter = cache(async (area: RestrictedArea): Promise<boolean> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return false;
  const result = await whoAmI(session.user.id);
  if (!result.ok) return false;
  return areaAllowed(result.data, area);
});
