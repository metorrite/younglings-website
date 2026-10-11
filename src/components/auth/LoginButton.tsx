import Image from "next/image";
import type { ButtonHTMLAttributes } from "react";

/**
 * The "Login with Discord" button, the same everywhere it appears. It is the same size and shape as the other buttons in the header
 * (the JonnyBot link, the search box), set apart by the clan logo and a gold edge that glows softly, and lifts a little on hover.
 * The glow's keyframes are `login-glow` in globals.css.
 */
export function LoginButton({ size = "sm", className = "", children, ...rest }: { size?: "sm" | "md" } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizing = size === "sm" ? "gap-2 px-3 py-1.5 text-sm" : "gap-2.5 px-5 py-2.5 text-sm";
  return (
    <button
      type="button"
      {...rest}
      className={`login-glow group inline-flex shrink-0 items-center rounded-md border border-gold/50 bg-gold/5 font-medium whitespace-nowrap text-foreground transition duration-200 hover:-translate-y-px hover:border-gold hover:bg-gold/15 disabled:opacity-60 disabled:hover:translate-y-0 ${sizing} ${className}`}
    >
      <Image
        src="/clan-logo.png"
        alt=""
        width={size === "sm" ? 18 : 22}
        height={size === "sm" ? 18 : 22}
        className="rounded-full transition duration-300 group-hover:rotate-[14deg] group-hover:scale-110"
      />
      {children}
    </button>
  );
}
