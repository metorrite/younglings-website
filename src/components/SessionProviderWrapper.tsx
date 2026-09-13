"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

// NextAuth's useSession/signIn/signOut hooks need this context provider somewhere above them
// in the tree. Kept as its own tiny client component so layout.tsx can stay a server component.
export function SessionProviderWrapper({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
