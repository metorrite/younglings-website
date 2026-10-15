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
  /** The last few finished weeks to choose from, newest first, with who won when the week has been locked. */
  weeks: { end: string; start: string; winners: string[] }[];
  /** This week's locked winners, or null while it is still open. */
  locked: WheelWeek | null;
}

/** Whether a winner has been given their prize, and the details recorded when it was. */
export interface WheelPrize {
  status: "PENDING" | "GIVEN";
  /** In gp, when it was recorded. */
  amount: number | null;
  paidBy: string | null;
  paidByName: string | null;
  recipient: string | null;
  recipientName: string | null;
  givenBy: string | null;
  givenByName: string | null;
  givenAt: string | null;
  note: string | null;
  /** Recorded in the clan coffer (the gp moved), as opposed to marked given by hand. */
  inCoffer: boolean;
}

/** One locked winner of a week: first place is 1. Several winners make a week with larger prizes. */
export interface WheelWinner {
  /** The Wednesday the week ended (YYYY-MM-DD), and the one it began. */
  end: string;
  start: string;
  place: number;
  winner: string;
  /** How it came about: spun on a wheel, typed in by hand, or picked by the weekly auto-post. */
  method: "SPUN" | "MANUAL" | "AUTO";
  lockedAt: string;
  lockedBy: string | null;
  lockedByName: string | null;
  /** The slices of the wheel this winner was picked from, one name per slice. */
  entries: string[];
  entryCount: number;
  /** False for a moment after locking while the bot draws its own picture. */
  hasGif: boolean;
  gifSource: "WEBSITE" | "BOT" | null;
  /** Names this winner's picture in its public address, /api/citadel-wheel/<token>.gif. */
  gifToken: string;
  prize: WheelPrize;
  /** The Discord member this winner's RuneScape name is linked to, when it is. */
  linkedUser: string | null;
  linkedUserName: string | null;
}

/** A locked week: its winners in order of place, and (when asked for) the announcement with everything filled in. */
export interface WheelWeek {
  end: string;
  start: string;
  winners: WheelWinner[];
  message?: string;
}

/** Someone holding gp in the clan coffer, who can have paid a prize. */
export interface CofferHolderInfo {
  userId: string;
  name: string | null;
  balance: number;
}

/** How a server announces the wheel's winner, as the bot's `citadel/wheel` route answers. */
export interface WheelSettings {
  /** Announce a winner automatically when the weekly Citadel list is made. */
  autoPost: boolean;
  /** The channel announcements go to (null until one is chosen). */
  channelId: string | null;
  /** The message template: {winner} (or {winners}), {mention}, {week} and {entries} are filled in; {wheel} marks where the GIF address goes in a copy. */
  message: string;
  defaultMessage: string;
  maxLength: number;
}
