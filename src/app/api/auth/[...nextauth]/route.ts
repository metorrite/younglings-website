import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authOptionsFor } from "@/lib/auth";

/** Built per request: with two cookie domains (AUTH_COOKIE_DOMAINS) the session cookie is set and cleared on the apex of the host in use. */
async function handler(req: NextRequest, ctx: { params: Promise<{ nextauth: string[] }> }) {
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").split(",")[0].trim();
  return NextAuth(authOptionsFor(host))(req, ctx);
}

export { handler as GET, handler as POST };
