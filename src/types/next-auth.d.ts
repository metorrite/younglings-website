import type { DefaultSession } from "next-auth";

// Module augmentation: adds the Discord user ID we attach in the auth.ts callbacks to NextAuth's
// built-in Session type (the name/avatar/email fields already exist on DefaultSession["user"]).
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordId?: string;
  }
}
