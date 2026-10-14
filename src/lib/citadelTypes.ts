/** Who capped at the Clan Citadel in one week, as the bot's `citadel/cappers` route answers. */
export interface CitadelCappers {
  /** The Wednesday the week ended (YYYY-MM-DD), and the one it began. */
  end: string;
  start: string;
  from: string;
  to: string;
  /** One name per person who capped, with staff left off (see leftOut). */
  cappers: string[];
  /** Accounts that capped but are not on the wheel: staff (Discord admins, admin and higher clan ranks) and anyone linked to them, with the reason. */
  leftOut: { name: string; reason: string }[];
  /** People who capped on more than one account: they have one entry, shown under the first account. */
  merged: { name: string; accounts: string[] }[];
  /** The last few finished weeks to choose from, newest first. */
  weeks: { end: string; start: string }[];
}

/** How a server announces the wheel's winner, as the bot's `citadel/wheel` route answers. */
export interface WheelSettings {
  /** Announce a winner automatically when the weekly Citadel list is made. */
  autoPost: boolean;
  /** The channel announcements go to (null until one is chosen). */
  channelId: string | null;
  /** The message template: {winner}, {mention}, {week} and {entries} are filled in. */
  message: string;
  defaultMessage: string;
  maxLength: number;
}
