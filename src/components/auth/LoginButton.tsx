import Image from "next/image";
import type { ButtonHTMLAttributes } from "react";

/**
 * The "Login with Discord" button, the same everywhere it appears. Crimson with a gold edge, to match the clan's logo and the site's
 * gold accents while standing clear of the near-black page.
 */
export function LoginButton({ size = "md", className = "", children, ...rest }: { size?: "sm" | "md" } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizing = size === "sm" ? "gap-2 px-3 py-1.5 text-sm" : "gap-2.5 px-5 py-2.5 text-sm";
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center rounded-md border border-gold/60 bg-gradient-to-b from-[#a32323] to-[#6b1414] font-semibold text-white shadow-[0_0_0_1px_rgba(0,0,0,0.4)] transition hover:border-gold hover:from-[#bb2a2a] hover:to-[#7c1818] hover:shadow-[0_0_14px_rgba(212,175,55,0.35)] disabled:opacity-60 ${sizing} ${className}`}
    >
      <Image src="/clan-logo.png" alt="" width={size === "sm" ? 20 : 22} height={size === "sm" ? 20 : 22} className="rounded-full" />
      {children}
    </button>
  );
}
