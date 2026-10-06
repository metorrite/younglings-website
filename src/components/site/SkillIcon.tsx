import Image from "next/image";

/** RuneScape's own skill icon (bundled in /public/skills), by skill name. "Overall" gives the total-level icon. */
export function SkillIcon({ name, size = 28, className = "" }: { name: string; size?: number; className?: string }) {
  return <Image src={`/skills/${name.toLowerCase()}.png`} alt="" width={size} height={size} className={`shrink-0 ${className}`} unoptimized />;
}
