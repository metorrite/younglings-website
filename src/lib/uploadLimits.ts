/** The parts of picture uploads the browser needs too, kept apart from `uploads.ts` because that one reads request headers and is server-only. */

/** Pictures a server uploads for its messages live in the bot's database; the site serves them here, which is the address an embed uses. */
export const UPLOAD_PATH = "/api/uploads";

/** Same limit as the bot (which is the one that actually enforces it), so a too-big file is refused before it is sent anywhere. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export type UploadResult = { ok: true; data: { url: string } } | { ok: false; error: string; problems: string[] };
