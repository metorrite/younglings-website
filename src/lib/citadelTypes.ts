/** Who capped at the Clan Citadel in one week, as the bot's `citadel/cappers` route answers. */
export interface CitadelCappers {
  /** The Wednesday the week ended (YYYY-MM-DD), and the one it began. */
  end: string;
  start: string;
  from: string;
  to: string;
  cappers: string[];
  /** The last few finished weeks to choose from, newest first. */
  weeks: { end: string; start: string }[];
}
