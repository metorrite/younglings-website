/** The events hub's moderation as the owner's dashboard reads it (bot route `hub-moderation`, T-218). Only the bot's owner gets anything but `canEdit: false`. */
export interface HubModeration {
  canEdit: boolean;
  reports: { id: string; eventId: string; guildId: string; serverName: string | null; eventName: string; reason: string; reporter: string | null; createdAt: string; takenDown: boolean }[];
  takenDown: { eventId: string; eventName: string; guildId: string; serverName: string | null; reason: string | null }[];
  barred: { guildId: string; serverName: string | null; reason: string; at: string }[];
}
