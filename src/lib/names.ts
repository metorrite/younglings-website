/**
 * How to show a person's name: exactly as typed if they set a server nickname (so a deliberately lowercase
 * nickname stays lowercase), otherwise their Discord username with the first letter capitalised.
 */
export function displayName(nickname: string | null | undefined, username: string | null | undefined): string {
  const nick = nickname?.trim();
  if (nick) return nick;
  const name = username?.trim() ?? "";
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : "Member";
}
