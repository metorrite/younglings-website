// The real setup schemas from the bot, dumped by a throwaway test. Preview only.
export const schemas: Record<string, unknown> = {
 "custom": {
  "template": "custom",
  "standard": {
   "template": "custom",
   "scope": "PRIVATE",
   "name": "Custom event · 17 Oct",
   "description": "",
   "startsAt": "2026-10-17T12:00:00Z",
   "scoringMode": "INDIVIDUAL",
   "config": {
    "buyIn": {
     "showPot": true,
     "amount": 0,
     "enabled": false
    },
    "setup": {
     "mode": "STANDARD"
    },
    "teamPolicy": "everyone",
    "queue": "FIRST_COME",
    "verification": {
     "instructions": "",
     "gate": "TEAMS",
     "required": false
    }
   },
   "endsAt": "2026-10-24T12:00:00Z",
   "maxParticipants": 0
  },
  "options": [
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Name",
    "type": "TEXT",
    "required": {
     "always": true
    },
    "path": "name",
    "min": null,
    "hint": "What players see, at least 3 characters.",
    "showWhen": null,
    "step": "BASICS",
    "choices": [],
    "maxLength": 80
   },
   {
    "standard": "",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Description",
    "type": "TEXTAREA",
    "required": {
     "always": false
    },
    "path": "description",
    "min": null,
    "hint": "Optional. Shown to players on the event's page.",
    "showWhen": null,
    "step": "BASICS",
    "choices": [],
    "maxLength": 1000
   },
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Starts",
    "type": "DATETIME",
    "required": {
     "always": false
    },
    "path": "startsAt",
    "min": null,
    "hint": "When it is planned to start. Nothing starts by itself: an organiser starts the event.",
    "showWhen": null,
    "step": "WHEN",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Ends",
    "type": "DATETIME",
    "required": {
     "always": false
    },
    "path": "endsAt",
    "min": null,
    "hint": "When it is planned to end.",
    "showWhen": null,
    "step": "WHEN",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Signups close",
    "type": "DATETIME",
    "required": {
     "always": false
    },
    "path": "config.signupClosesAt",
    "min": null,
    "hint": "Optional. After this players can't join themselves and signups close; staff can still add late entries.",
    "showWhen": null,
    "step": "WHEN",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "INDIVIDUAL",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Who plays",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "scoringMode",
    "min": null,
    "hint": "Teams add up points per team.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "Solo players",
      "value": "INDIVIDUAL"
     },
     {
      "hint": "",
      "label": "Teams",
      "value": "TEAM"
     }
    ],
    "maxLength": null
   },
   {
    "standard": 0,
    "quick": false,
    "widget": null,
    "max": 1000,
    "numeric": true,
    "label": "Most players",
    "type": "INT",
    "required": {
     "always": false
    },
    "path": "maxParticipants",
    "min": 0,
    "hint": "0 for no limit. A full event gets a waitlist.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "PRIVATE",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Who can see it",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "scope",
    "min": null,
    "hint": "Only your clan sees it by default.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "Clan only",
      "value": "PRIVATE"
     },
     {
      "hint": "",
      "label": "Clan and allies",
      "value": "ALLIANCE"
     },
     {
      "hint": "",
      "label": "Everyone",
      "value": "PUBLIC"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "everyone",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Who may join and share a team",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.teamPolicy",
    "min": null,
    "hint": "Decides whether clan members, other members of this server and players from other servers may take part and play together.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "Everyone, mixed freely",
      "value": "everyone"
     },
     {
      "hint": "",
      "label": "Only this server",
      "value": "home"
     },
     {
      "hint": "",
      "label": "Clan members apart from everyone else",
      "value": "clanVsOutsiders"
     },
     {
      "hint": "",
      "label": "Every kind on its own teams",
      "value": "separate"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "FIRST_COME",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "When the event is full",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.queue",
    "min": null,
    "hint": "Who gets a place when someone leaves.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "First come, first served",
      "value": "FIRST_COME"
     },
     {
      "hint": "",
      "label": "Clan members first",
      "value": "CLAN_FIRST"
     }
    ],
    "maxLength": null
   },
   {
    "standard": false,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Buy-in",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.buyIn.enabled",
    "min": null,
    "hint": "Players pay in-game gp to enter, and the paid total makes the pot.",
    "showWhen": null,
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": 0,
    "quick": false,
    "widget": null,
    "max": 1000000000000,
    "numeric": true,
    "label": "Buy-in amount (gp)",
    "type": "INT",
    "required": {
     "always": false,
     "when": {
      "path": "config.buyIn.enabled",
      "negate": false,
      "value": true
     }
    },
    "path": "config.buyIn.amount",
    "min": 1,
    "hint": "What each player pays.",
    "showWhen": {
     "path": "config.buyIn.enabled",
     "negate": false,
     "value": true
    },
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": true,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Show the pot to players",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.buyIn.showPot",
    "min": null,
    "hint": "Players see how much is in the pot.",
    "showWhen": {
     "path": "config.buyIn.enabled",
     "negate": false,
     "value": true
    },
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Prizes",
    "type": "PRIZES",
    "required": {
     "always": false
    },
    "path": "prizes",
    "min": null,
    "hint": "A prize goes to one place or a range of places. Optional; you can also add them later.",
    "showWhen": null,
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Signup channel",
    "type": "CHANNEL",
    "required": {
     "always": false,
     "when": {
      "path": "config.signupAdminChannelId",
      "set": true,
      "negate": false
     }
    },
    "path": "config.signupChannelId",
    "min": null,
    "hint": "Where the signup is posted for players. Choose it together with the staff channel.",
    "showWhen": null,
    "step": "DISCORD",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Signup staff channel",
    "type": "CHANNEL",
    "required": {
     "always": false,
     "when": {
      "path": "config.signupChannelId",
      "set": true,
      "negate": false
     }
    },
    "path": "config.signupAdminChannelId",
    "min": null,
    "hint": "Where staff see who signed up.",
    "showWhen": null,
    "step": "DISCORD",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "STANDARD",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Setup steps",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.setup.mode",
    "min": null,
    "hint": "Follow the steps (close signups, confirm the roster) before the event can start, or start it whenever you like.",
    "showWhen": null,
    "step": "SETUP",
    "choices": [
     {
      "hint": "",
      "label": "Follow the setup steps",
      "value": "STANDARD"
     },
     {
      "hint": "",
      "label": "Start whenever I like",
      "value": "OFF"
     }
    ],
    "maxLength": null
   },
   {
    "standard": false,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Players must be verified",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.verification.required",
    "min": null,
    "hint": "Players send proof first (for example a screenshot of what they hold) and an organiser approves it.",
    "showWhen": null,
    "step": "SETUP",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "TEAMS",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Must be verified by",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.verification.gate",
    "min": null,
    "hint": "When a player who isn't verified stops counting.",
    "showWhen": {
     "path": "config.verification.required",
     "negate": false,
     "value": true
    },
    "step": "SETUP",
    "choices": [
     {
      "hint": "They count once approved. Until then they are on the list but not in the event.",
      "label": "When they sign up",
      "value": "SIGNUP"
     },
     {
      "hint": "Anyone can sign up; players who aren't verified by then are left out of the teams unless you let them through.",
      "label": "Before teams are made (usual)",
      "value": "TEAMS"
     },
     {
      "hint": "Everyone can be in a team, but the event can't start until every player is verified, waived or removed.",
      "label": "Before the event starts",
      "value": "START"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "What players are told to send",
    "type": "TEXTAREA",
    "required": {
     "always": false
    },
    "path": "config.verification.instructions",
    "min": null,
    "hint": "Shown to players who join. Up to 1000 characters.",
    "showWhen": {
     "path": "config.verification.required",
     "negate": false,
     "value": true
    },
    "step": "SETUP",
    "choices": [],
    "maxLength": 1000
   }
  ],
  "description": "Start from nothing: add your own objectives, points and prerequisites. Everything the other templates do is built from these.",
  "days": 7,
  "label": "Custom event",
  "steps": [
   {
    "label": "The basics",
    "blurb": "Name the event and say what it is.",
    "key": "BASICS"
   },
   {
    "label": "When",
    "blurb": "When it starts and ends, and when signups close.",
    "key": "WHEN"
   },
   {
    "label": "The rules",
    "blurb": "What the event is made of.",
    "key": "RULES"
   },
   {
    "label": "Players",
    "blurb": "Who can take part and how they are scored.",
    "key": "PLAYERS"
   },
   {
    "label": "Buy-in and prizes",
    "blurb": "What players pay to enter and what they can win.",
    "key": "MONEY"
   },
   {
    "label": "Discord",
    "blurb": "Where signups, the board and proof go.",
    "key": "DISCORD"
   },
   {
    "label": "Setup steps and verification",
    "blurb": "How much of the setup checklist the event follows, and whether players must be verified.",
    "key": "SETUP"
   }
  ],
  "startsInHours": 24
 },
 "bingo": {
  "template": "bingo",
  "standard": {
   "template": "bingo",
   "scope": "PRIVATE",
   "name": "Bingo · 17 Oct",
   "description": "",
   "startsAt": "2026-10-17T12:00:00Z",
   "scoringMode": "INDIVIDUAL",
   "config": {
    "buyIn": {
     "showPot": true,
     "amount": 0,
     "enabled": false
    },
    "blackoutBonus": 250,
    "setup": {
     "mode": "STANDARD"
    },
    "lineBonus": 50,
    "teamPolicy": "everyone",
    "board": {
     "layout": "grid",
     "unlock": "auto",
     "size": 5,
     "pool": "drops",
     "look": "runescape"
    },
    "queue": "FIRST_COME",
    "verification": {
     "instructions": "",
     "gate": "TEAMS",
     "required": false
    }
   },
   "endsAt": "2026-10-24T12:00:00Z",
   "maxParticipants": 0
  },
  "options": [
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Name",
    "type": "TEXT",
    "required": {
     "always": true
    },
    "path": "name",
    "min": null,
    "hint": "What players see, at least 3 characters.",
    "showWhen": null,
    "step": "BASICS",
    "choices": [],
    "maxLength": 80
   },
   {
    "standard": "",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Description",
    "type": "TEXTAREA",
    "required": {
     "always": false
    },
    "path": "description",
    "min": null,
    "hint": "Optional. Shown to players on the event's page.",
    "showWhen": null,
    "step": "BASICS",
    "choices": [],
    "maxLength": 1000
   },
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Starts",
    "type": "DATETIME",
    "required": {
     "always": false
    },
    "path": "startsAt",
    "min": null,
    "hint": "When it is planned to start. Nothing starts by itself: an organiser starts the event.",
    "showWhen": null,
    "step": "WHEN",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Ends",
    "type": "DATETIME",
    "required": {
     "always": false
    },
    "path": "endsAt",
    "min": null,
    "hint": "When it is planned to end.",
    "showWhen": null,
    "step": "WHEN",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Signups close",
    "type": "DATETIME",
    "required": {
     "always": false
    },
    "path": "config.signupClosesAt",
    "min": null,
    "hint": "Optional. After this players can't join themselves and signups close; staff can still add late entries.",
    "showWhen": null,
    "step": "WHEN",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "grid",
    "quick": true,
    "widget": "shape",
    "max": null,
    "numeric": false,
    "label": "Board shape",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.board.layout",
    "min": null,
    "hint": "A square grid, or one of the picture shapes.",
    "showWhen": null,
    "step": "RULES",
    "choices": [
     {
      "hint": "Rows, columns and diagonals earn bonuses.",
      "label": "Square grid",
      "value": "grid"
     },
     {
      "hint": "24 tiles along a winding trail, from the start to the treasure chest.",
      "label": "The Adventurer's Path",
      "value": "path"
     },
     {
      "hint": "15 tiles in five tiers: five at the base, one fewer each step up, one at the apex.",
      "label": "Pyramid of the Pharaohs",
      "value": "pyramid"
     },
     {
      "hint": "12 tiles on the outer ring, 4 on the inner ring, and the final boss at the centre.",
      "label": "The Boss Convergence",
      "value": "convergence"
     },
     {
      "hint": "16 tiles from seven roots up through branches and limbs to the crown.",
      "label": "The World Tree",
      "value": "tree"
     }
    ],
    "maxLength": null
   },
   {
    "standard": 5,
    "quick": false,
    "widget": null,
    "max": 7,
    "numeric": true,
    "label": "Board size",
    "type": "INT",
    "required": {
     "always": false
    },
    "path": "config.board.size",
    "min": 3,
    "hint": "3 to 7 tiles across.",
    "showWhen": {
     "path": "config.board.layout",
     "negate": false,
     "value": "grid"
    },
    "step": "RULES",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "auto",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Tiles open",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.board.unlock",
    "min": null,
    "hint": "In order, a tile can only be done once the tiles it rests on are done (a drop for a closed tile can't be saved). Automatic is in order for tasks and any order for drops.",
    "showWhen": {
     "path": "config.board.layout",
     "negate": true,
     "value": "grid"
    },
    "step": "RULES",
    "choices": [
     {
      "hint": "",
      "label": "Automatic",
      "value": "auto"
     },
     {
      "hint": "",
      "label": "In order",
      "value": "locked"
     },
     {
      "hint": "",
      "label": "Any order (the shape only earns bonuses)",
      "value": "free"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "drops",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Tiles come from",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.board.pool",
    "min": null,
    "hint": "You can edit, lock and swap any tile afterwards.",
    "showWhen": null,
    "step": "RULES",
    "choices": [
     {
      "hint": "",
      "label": "Boss drops",
      "value": "drops"
     },
     {
      "hint": "",
      "label": "Kills, skilling and goals",
      "value": "classic"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "runescape",
    "quick": false,
    "widget": "look",
    "max": null,
    "numeric": false,
    "label": "Look",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.board.look",
    "min": null,
    "hint": "What the board picture in Discord is drawn on. You can change it any time before the event ends.",
    "showWhen": null,
    "step": "RULES",
    "choices": [
     {
      "hint": "A scene painted for each shape: a desert night, a treasure map, a ritual circle, an old grove. The square grid gets a stone hall.",
      "label": "RuneScape",
      "value": "runescape"
     },
     {
      "hint": "The original template pictures: a dark teal board with a gold frame.",
      "label": "Template",
      "value": "classic"
     }
    ],
    "maxLength": null
   },
   {
    "standard": 50,
    "quick": false,
    "widget": null,
    "max": 100000,
    "numeric": true,
    "label": "Bonus per line",
    "type": "INT",
    "required": {
     "always": false
    },
    "path": "config.lineBonus",
    "min": 0,
    "hint": "A row, column or diagonal on a grid; a finished tier, row or ring on a shape. 0 for none.",
    "showWhen": null,
    "step": "RULES",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": 250,
    "quick": false,
    "widget": null,
    "max": 100000,
    "numeric": true,
    "label": "Blackout bonus",
    "type": "INT",
    "required": {
     "always": false
    },
    "path": "config.blackoutBonus",
    "min": 0,
    "hint": "Every tile done. 0 for none.",
    "showWhen": null,
    "step": "RULES",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "INDIVIDUAL",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Who plays",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "scoringMode",
    "min": null,
    "hint": "Teams add up points per team.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "Solo players",
      "value": "INDIVIDUAL"
     },
     {
      "hint": "",
      "label": "Teams",
      "value": "TEAM"
     }
    ],
    "maxLength": null
   },
   {
    "standard": 0,
    "quick": false,
    "widget": null,
    "max": 1000,
    "numeric": true,
    "label": "Most players",
    "type": "INT",
    "required": {
     "always": false
    },
    "path": "maxParticipants",
    "min": 0,
    "hint": "0 for no limit. A full event gets a waitlist.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "PRIVATE",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Who can see it",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "scope",
    "min": null,
    "hint": "Only your clan sees it by default.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "Clan only",
      "value": "PRIVATE"
     },
     {
      "hint": "",
      "label": "Clan and allies",
      "value": "ALLIANCE"
     },
     {
      "hint": "",
      "label": "Everyone",
      "value": "PUBLIC"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "everyone",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Who may join and share a team",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.teamPolicy",
    "min": null,
    "hint": "Decides whether clan members, other members of this server and players from other servers may take part and play together.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "Everyone, mixed freely",
      "value": "everyone"
     },
     {
      "hint": "",
      "label": "Only this server",
      "value": "home"
     },
     {
      "hint": "",
      "label": "Clan members apart from everyone else",
      "value": "clanVsOutsiders"
     },
     {
      "hint": "",
      "label": "Every kind on its own teams",
      "value": "separate"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "FIRST_COME",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "When the event is full",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.queue",
    "min": null,
    "hint": "Who gets a place when someone leaves.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "First come, first served",
      "value": "FIRST_COME"
     },
     {
      "hint": "",
      "label": "Clan members first",
      "value": "CLAN_FIRST"
     }
    ],
    "maxLength": null
   },
   {
    "standard": false,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Buy-in",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.buyIn.enabled",
    "min": null,
    "hint": "Players pay in-game gp to enter, and the paid total makes the pot.",
    "showWhen": null,
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": 0,
    "quick": false,
    "widget": null,
    "max": 1000000000000,
    "numeric": true,
    "label": "Buy-in amount (gp)",
    "type": "INT",
    "required": {
     "always": false,
     "when": {
      "path": "config.buyIn.enabled",
      "negate": false,
      "value": true
     }
    },
    "path": "config.buyIn.amount",
    "min": 1,
    "hint": "What each player pays.",
    "showWhen": {
     "path": "config.buyIn.enabled",
     "negate": false,
     "value": true
    },
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": true,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Show the pot to players",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.buyIn.showPot",
    "min": null,
    "hint": "Players see how much is in the pot.",
    "showWhen": {
     "path": "config.buyIn.enabled",
     "negate": false,
     "value": true
    },
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Prizes",
    "type": "PRIZES",
    "required": {
     "always": false
    },
    "path": "prizes",
    "min": null,
    "hint": "A prize goes to one place or a range of places. Optional; you can also add them later.",
    "showWhen": null,
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Signup channel",
    "type": "CHANNEL",
    "required": {
     "always": false,
     "when": {
      "path": "config.signupAdminChannelId",
      "set": true,
      "negate": false
     }
    },
    "path": "config.signupChannelId",
    "min": null,
    "hint": "Where the signup is posted for players. Choose it together with the staff channel.",
    "showWhen": null,
    "step": "DISCORD",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Signup staff channel",
    "type": "CHANNEL",
    "required": {
     "always": false,
     "when": {
      "path": "config.signupChannelId",
      "set": true,
      "negate": false
     }
    },
    "path": "config.signupAdminChannelId",
    "min": null,
    "hint": "Where staff see who signed up.",
    "showWhen": null,
    "step": "DISCORD",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Live board channel",
    "type": "CHANNEL",
    "required": {
     "always": false
    },
    "path": "config.boardChannelId",
    "min": null,
    "hint": "The board picture is posted here when the event starts and updates as tiles are approved.",
    "showWhen": null,
    "step": "DISCORD",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Screenshot review channel",
    "type": "CHANNEL",
    "required": {
     "always": false
    },
    "path": "config.reviewChannelId",
    "min": null,
    "hint": "Players send proof with /events submit; it lands here for staff.",
    "showWhen": null,
    "step": "DISCORD",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "STANDARD",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Setup steps",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.setup.mode",
    "min": null,
    "hint": "Follow the steps (close signups, confirm the roster) before the event can start, or start it whenever you like.",
    "showWhen": null,
    "step": "SETUP",
    "choices": [
     {
      "hint": "",
      "label": "Follow the setup steps",
      "value": "STANDARD"
     },
     {
      "hint": "",
      "label": "Start whenever I like",
      "value": "OFF"
     }
    ],
    "maxLength": null
   },
   {
    "standard": false,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Players must be verified",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.verification.required",
    "min": null,
    "hint": "Players send proof first (for example a screenshot of what they hold) and an organiser approves it.",
    "showWhen": null,
    "step": "SETUP",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "TEAMS",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Must be verified by",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.verification.gate",
    "min": null,
    "hint": "When a player who isn't verified stops counting.",
    "showWhen": {
     "path": "config.verification.required",
     "negate": false,
     "value": true
    },
    "step": "SETUP",
    "choices": [
     {
      "hint": "They count once approved. Until then they are on the list but not in the event.",
      "label": "When they sign up",
      "value": "SIGNUP"
     },
     {
      "hint": "Anyone can sign up; players who aren't verified by then are left out of the teams unless you let them through.",
      "label": "Before teams are made (usual)",
      "value": "TEAMS"
     },
     {
      "hint": "Everyone can be in a team, but the event can't start until every player is verified, waived or removed.",
      "label": "Before the event starts",
      "value": "START"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "What players are told to send",
    "type": "TEXTAREA",
    "required": {
     "always": false
    },
    "path": "config.verification.instructions",
    "min": null,
    "hint": "Shown to players who join. Up to 1000 characters.",
    "showWhen": {
     "path": "config.verification.required",
     "negate": false,
     "value": true
    },
    "step": "SETUP",
    "choices": [],
    "maxLength": 1000
   }
  ],
  "description": "A board of tiles. Complete tiles for points, and earn bonuses for rows, columns, diagonals and a full blackout. Pick the size, re-roll the board, lock the tiles you like.",
  "days": 7,
  "label": "Bingo",
  "steps": [
   {
    "label": "The basics",
    "blurb": "Name the event and say what it is.",
    "key": "BASICS"
   },
   {
    "label": "When",
    "blurb": "When it starts and ends, and when signups close.",
    "key": "WHEN"
   },
   {
    "label": "The rules",
    "blurb": "What the event is made of.",
    "key": "RULES"
   },
   {
    "label": "Players",
    "blurb": "Who can take part and how they are scored.",
    "key": "PLAYERS"
   },
   {
    "label": "Buy-in and prizes",
    "blurb": "What players pay to enter and what they can win.",
    "key": "MONEY"
   },
   {
    "label": "Discord",
    "blurb": "Where signups, the board and proof go.",
    "key": "DISCORD"
   },
   {
    "label": "Setup steps and verification",
    "blurb": "How much of the setup checklist the event follows, and whether players must be verified.",
    "key": "SETUP"
   }
  ],
  "startsInHours": 24
 },
 "scavenger-hunt": {
  "template": "scavenger-hunt",
  "standard": {
   "template": "scavenger-hunt",
   "scope": "PRIVATE",
   "name": "Scavenger hunt · 17 Oct",
   "description": "",
   "startsAt": "2026-10-17T12:00:00Z",
   "scoringMode": "INDIVIDUAL",
   "config": {
    "finishBonus": 100,
    "buyIn": {
     "showPot": true,
     "amount": 0,
     "enabled": false
    },
    "ordered": false,
    "setup": {
     "mode": "STANDARD"
    },
    "steps": 8,
    "stepPoints": 25,
    "teamPolicy": "everyone",
    "queue": "FIRST_COME",
    "verification": {
     "instructions": "",
     "gate": "TEAMS",
     "required": false
    }
   },
   "endsAt": "2026-10-24T12:00:00Z",
   "maxParticipants": 0
  },
  "options": [
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Name",
    "type": "TEXT",
    "required": {
     "always": true
    },
    "path": "name",
    "min": null,
    "hint": "What players see, at least 3 characters.",
    "showWhen": null,
    "step": "BASICS",
    "choices": [],
    "maxLength": 80
   },
   {
    "standard": "",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Description",
    "type": "TEXTAREA",
    "required": {
     "always": false
    },
    "path": "description",
    "min": null,
    "hint": "Optional. Shown to players on the event's page.",
    "showWhen": null,
    "step": "BASICS",
    "choices": [],
    "maxLength": 1000
   },
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Starts",
    "type": "DATETIME",
    "required": {
     "always": false
    },
    "path": "startsAt",
    "min": null,
    "hint": "When it is planned to start. Nothing starts by itself: an organiser starts the event.",
    "showWhen": null,
    "step": "WHEN",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Ends",
    "type": "DATETIME",
    "required": {
     "always": false
    },
    "path": "endsAt",
    "min": null,
    "hint": "When it is planned to end.",
    "showWhen": null,
    "step": "WHEN",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Signups close",
    "type": "DATETIME",
    "required": {
     "always": false
    },
    "path": "config.signupClosesAt",
    "min": null,
    "hint": "Optional. After this players can't join themselves and signups close; staff can still add late entries.",
    "showWhen": null,
    "step": "WHEN",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": 8,
    "quick": true,
    "widget": null,
    "max": 30,
    "numeric": true,
    "label": "Items to find",
    "type": "INT",
    "required": {
     "always": false
    },
    "path": "config.steps",
    "min": 3,
    "hint": "3 to 30. Rename them into clues later.",
    "showWhen": null,
    "step": "RULES",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": 25,
    "quick": false,
    "widget": null,
    "max": 100000,
    "numeric": true,
    "label": "Points per item",
    "type": "INT",
    "required": {
     "always": false
    },
    "path": "config.stepPoints",
    "min": 0,
    "hint": "What each item is worth.",
    "showWhen": null,
    "step": "RULES",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": false,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "One after another",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.ordered",
    "min": null,
    "hint": "Each item opens after the one before.",
    "showWhen": null,
    "step": "RULES",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": 100,
    "quick": false,
    "widget": null,
    "max": 100000,
    "numeric": true,
    "label": "Bonus for finding everything",
    "type": "INT",
    "required": {
     "always": false
    },
    "path": "config.finishBonus",
    "min": 0,
    "hint": "0 for none.",
    "showWhen": null,
    "step": "RULES",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "INDIVIDUAL",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Who plays",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "scoringMode",
    "min": null,
    "hint": "Teams add up points per team.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "Solo players",
      "value": "INDIVIDUAL"
     },
     {
      "hint": "",
      "label": "Teams",
      "value": "TEAM"
     }
    ],
    "maxLength": null
   },
   {
    "standard": 0,
    "quick": false,
    "widget": null,
    "max": 1000,
    "numeric": true,
    "label": "Most players",
    "type": "INT",
    "required": {
     "always": false
    },
    "path": "maxParticipants",
    "min": 0,
    "hint": "0 for no limit. A full event gets a waitlist.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "PRIVATE",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Who can see it",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "scope",
    "min": null,
    "hint": "Only your clan sees it by default.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "Clan only",
      "value": "PRIVATE"
     },
     {
      "hint": "",
      "label": "Clan and allies",
      "value": "ALLIANCE"
     },
     {
      "hint": "",
      "label": "Everyone",
      "value": "PUBLIC"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "everyone",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Who may join and share a team",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.teamPolicy",
    "min": null,
    "hint": "Decides whether clan members, other members of this server and players from other servers may take part and play together.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "Everyone, mixed freely",
      "value": "everyone"
     },
     {
      "hint": "",
      "label": "Only this server",
      "value": "home"
     },
     {
      "hint": "",
      "label": "Clan members apart from everyone else",
      "value": "clanVsOutsiders"
     },
     {
      "hint": "",
      "label": "Every kind on its own teams",
      "value": "separate"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "FIRST_COME",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "When the event is full",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.queue",
    "min": null,
    "hint": "Who gets a place when someone leaves.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "First come, first served",
      "value": "FIRST_COME"
     },
     {
      "hint": "",
      "label": "Clan members first",
      "value": "CLAN_FIRST"
     }
    ],
    "maxLength": null
   },
   {
    "standard": false,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Buy-in",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.buyIn.enabled",
    "min": null,
    "hint": "Players pay in-game gp to enter, and the paid total makes the pot.",
    "showWhen": null,
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": 0,
    "quick": false,
    "widget": null,
    "max": 1000000000000,
    "numeric": true,
    "label": "Buy-in amount (gp)",
    "type": "INT",
    "required": {
     "always": false,
     "when": {
      "path": "config.buyIn.enabled",
      "negate": false,
      "value": true
     }
    },
    "path": "config.buyIn.amount",
    "min": 1,
    "hint": "What each player pays.",
    "showWhen": {
     "path": "config.buyIn.enabled",
     "negate": false,
     "value": true
    },
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": true,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Show the pot to players",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.buyIn.showPot",
    "min": null,
    "hint": "Players see how much is in the pot.",
    "showWhen": {
     "path": "config.buyIn.enabled",
     "negate": false,
     "value": true
    },
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Prizes",
    "type": "PRIZES",
    "required": {
     "always": false
    },
    "path": "prizes",
    "min": null,
    "hint": "A prize goes to one place or a range of places. Optional; you can also add them later.",
    "showWhen": null,
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Signup channel",
    "type": "CHANNEL",
    "required": {
     "always": false,
     "when": {
      "path": "config.signupAdminChannelId",
      "set": true,
      "negate": false
     }
    },
    "path": "config.signupChannelId",
    "min": null,
    "hint": "Where the signup is posted for players. Choose it together with the staff channel.",
    "showWhen": null,
    "step": "DISCORD",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Signup staff channel",
    "type": "CHANNEL",
    "required": {
     "always": false,
     "when": {
      "path": "config.signupChannelId",
      "set": true,
      "negate": false
     }
    },
    "path": "config.signupAdminChannelId",
    "min": null,
    "hint": "Where staff see who signed up.",
    "showWhen": null,
    "step": "DISCORD",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Screenshot review channel",
    "type": "CHANNEL",
    "required": {
     "always": false
    },
    "path": "config.reviewChannelId",
    "min": null,
    "hint": "Players send proof with /events submit; it lands here for staff.",
    "showWhen": null,
    "step": "DISCORD",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "STANDARD",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Setup steps",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.setup.mode",
    "min": null,
    "hint": "Follow the steps (close signups, confirm the roster) before the event can start, or start it whenever you like.",
    "showWhen": null,
    "step": "SETUP",
    "choices": [
     {
      "hint": "",
      "label": "Follow the setup steps",
      "value": "STANDARD"
     },
     {
      "hint": "",
      "label": "Start whenever I like",
      "value": "OFF"
     }
    ],
    "maxLength": null
   },
   {
    "standard": false,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Players must be verified",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.verification.required",
    "min": null,
    "hint": "Players send proof first (for example a screenshot of what they hold) and an organiser approves it.",
    "showWhen": null,
    "step": "SETUP",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "TEAMS",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Must be verified by",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.verification.gate",
    "min": null,
    "hint": "When a player who isn't verified stops counting.",
    "showWhen": {
     "path": "config.verification.required",
     "negate": false,
     "value": true
    },
    "step": "SETUP",
    "choices": [
     {
      "hint": "They count once approved. Until then they are on the list but not in the event.",
      "label": "When they sign up",
      "value": "SIGNUP"
     },
     {
      "hint": "Anyone can sign up; players who aren't verified by then are left out of the teams unless you let them through.",
      "label": "Before teams are made (usual)",
      "value": "TEAMS"
     },
     {
      "hint": "Everyone can be in a team, but the event can't start until every player is verified, waived or removed.",
      "label": "Before the event starts",
      "value": "START"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "What players are told to send",
    "type": "TEXTAREA",
    "required": {
     "always": false
    },
    "path": "config.verification.instructions",
    "min": null,
    "hint": "Shown to players who join. Up to 1000 characters.",
    "showWhen": {
     "path": "config.verification.required",
     "negate": false,
     "value": true
    },
    "step": "SETUP",
    "choices": [],
    "maxLength": 1000
   }
  ],
  "description": "A list of things to find. Players send a screenshot for each, in any order or one after another, and earn a bonus for finding everything.",
  "days": 7,
  "label": "Scavenger hunt",
  "steps": [
   {
    "label": "The basics",
    "blurb": "Name the event and say what it is.",
    "key": "BASICS"
   },
   {
    "label": "When",
    "blurb": "When it starts and ends, and when signups close.",
    "key": "WHEN"
   },
   {
    "label": "The rules",
    "blurb": "What the event is made of.",
    "key": "RULES"
   },
   {
    "label": "Players",
    "blurb": "Who can take part and how they are scored.",
    "key": "PLAYERS"
   },
   {
    "label": "Buy-in and prizes",
    "blurb": "What players pay to enter and what they can win.",
    "key": "MONEY"
   },
   {
    "label": "Discord",
    "blurb": "Where signups, the board and proof go.",
    "key": "DISCORD"
   },
   {
    "label": "Setup steps and verification",
    "blurb": "How much of the setup checklist the event follows, and whether players must be verified.",
    "key": "SETUP"
   }
  ],
  "startsInHours": 24
 },
 "competition": {
  "template": "competition",
  "standard": {
   "template": "competition",
   "scope": "PRIVATE",
   "name": "Competition · 17 Oct",
   "description": "",
   "startsAt": "2026-10-17T12:00:00Z",
   "scoringMode": "INDIVIDUAL",
   "config": {
    "buyIn": {
     "showPot": true,
     "amount": 0,
     "enabled": false
    },
    "skillId": -1,
    "setup": {
     "mode": "STANDARD"
    },
    "teamPolicy": "everyone",
    "queue": "FIRST_COME",
    "verification": {
     "instructions": "",
     "gate": "TEAMS",
     "required": false
    },
    "xpPerPoint": 10000
   },
   "endsAt": "2026-10-24T12:00:00Z",
   "maxParticipants": 0
  },
  "options": [
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Name",
    "type": "TEXT",
    "required": {
     "always": true
    },
    "path": "name",
    "min": null,
    "hint": "What players see, at least 3 characters.",
    "showWhen": null,
    "step": "BASICS",
    "choices": [],
    "maxLength": 80
   },
   {
    "standard": "",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Description",
    "type": "TEXTAREA",
    "required": {
     "always": false
    },
    "path": "description",
    "min": null,
    "hint": "Optional. Shown to players on the event's page.",
    "showWhen": null,
    "step": "BASICS",
    "choices": [],
    "maxLength": 1000
   },
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Starts",
    "type": "DATETIME",
    "required": {
     "always": false
    },
    "path": "startsAt",
    "min": null,
    "hint": "When it is planned to start. Nothing starts by itself: an organiser starts the event.",
    "showWhen": null,
    "step": "WHEN",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Ends",
    "type": "DATETIME",
    "required": {
     "always": false
    },
    "path": "endsAt",
    "min": null,
    "hint": "When it is planned to end.",
    "showWhen": null,
    "step": "WHEN",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Signups close",
    "type": "DATETIME",
    "required": {
     "always": false
    },
    "path": "config.signupClosesAt",
    "min": null,
    "hint": "Optional. After this players can't join themselves and signups close; staff can still add late entries.",
    "showWhen": null,
    "step": "WHEN",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": -1,
    "quick": true,
    "widget": "skill",
    "max": null,
    "numeric": true,
    "label": "Skill",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.skillId",
    "min": null,
    "hint": "Whose XP counts: one skill, or total XP.",
    "showWhen": null,
    "step": "RULES",
    "choices": [
     {
      "hint": "",
      "label": "Overall (total XP)",
      "value": "-1"
     },
     {
      "hint": "",
      "label": "Attack",
      "value": "0"
     },
     {
      "hint": "",
      "label": "Defence",
      "value": "1"
     },
     {
      "hint": "",
      "label": "Strength",
      "value": "2"
     },
     {
      "hint": "",
      "label": "Constitution",
      "value": "3"
     },
     {
      "hint": "",
      "label": "Ranged",
      "value": "4"
     },
     {
      "hint": "",
      "label": "Prayer",
      "value": "5"
     },
     {
      "hint": "",
      "label": "Magic",
      "value": "6"
     },
     {
      "hint": "",
      "label": "Cooking",
      "value": "7"
     },
     {
      "hint": "",
      "label": "Woodcutting",
      "value": "8"
     },
     {
      "hint": "",
      "label": "Fletching",
      "value": "9"
     },
     {
      "hint": "",
      "label": "Fishing",
      "value": "10"
     },
     {
      "hint": "",
      "label": "Firemaking",
      "value": "11"
     },
     {
      "hint": "",
      "label": "Crafting",
      "value": "12"
     },
     {
      "hint": "",
      "label": "Smithing",
      "value": "13"
     },
     {
      "hint": "",
      "label": "Mining",
      "value": "14"
     },
     {
      "hint": "",
      "label": "Herblore",
      "value": "15"
     },
     {
      "hint": "",
      "label": "Agility",
      "value": "16"
     },
     {
      "hint": "",
      "label": "Thieving",
      "value": "17"
     },
     {
      "hint": "",
      "label": "Slayer",
      "value": "18"
     },
     {
      "hint": "",
      "label": "Farming",
      "value": "19"
     },
     {
      "hint": "",
      "label": "Runecrafting",
      "value": "20"
     },
     {
      "hint": "",
      "label": "Hunter",
      "value": "21"
     },
     {
      "hint": "",
      "label": "Construction",
      "value": "22"
     },
     {
      "hint": "",
      "label": "Summoning",
      "value": "23"
     },
     {
      "hint": "",
      "label": "Dungeoneering",
      "value": "24"
     },
     {
      "hint": "",
      "label": "Divination",
      "value": "25"
     },
     {
      "hint": "",
      "label": "Invention",
      "value": "26"
     },
     {
      "hint": "",
      "label": "Archaeology",
      "value": "27"
     },
     {
      "hint": "",
      "label": "Necromancy",
      "value": "28"
     }
    ],
    "maxLength": null
   },
   {
    "standard": 10000,
    "quick": false,
    "widget": null,
    "max": 1000000,
    "numeric": true,
    "label": "XP per point",
    "type": "INT",
    "required": {
     "always": false
    },
    "path": "config.xpPerPoint",
    "min": 1,
    "hint": "How much XP earns one point. A larger number keeps points small.",
    "showWhen": null,
    "step": "RULES",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "INDIVIDUAL",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Who plays",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "scoringMode",
    "min": null,
    "hint": "Teams add up points per team.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "Solo players",
      "value": "INDIVIDUAL"
     },
     {
      "hint": "",
      "label": "Teams",
      "value": "TEAM"
     }
    ],
    "maxLength": null
   },
   {
    "standard": 0,
    "quick": false,
    "widget": null,
    "max": 1000,
    "numeric": true,
    "label": "Most players",
    "type": "INT",
    "required": {
     "always": false
    },
    "path": "maxParticipants",
    "min": 0,
    "hint": "0 for no limit. A full event gets a waitlist.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "PRIVATE",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Who can see it",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "scope",
    "min": null,
    "hint": "Only your clan sees it by default.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "Clan only",
      "value": "PRIVATE"
     },
     {
      "hint": "",
      "label": "Clan and allies",
      "value": "ALLIANCE"
     },
     {
      "hint": "",
      "label": "Everyone",
      "value": "PUBLIC"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "everyone",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Who may join and share a team",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.teamPolicy",
    "min": null,
    "hint": "Decides whether clan members, other members of this server and players from other servers may take part and play together.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "Everyone, mixed freely",
      "value": "everyone"
     },
     {
      "hint": "",
      "label": "Only this server",
      "value": "home"
     },
     {
      "hint": "",
      "label": "Clan members apart from everyone else",
      "value": "clanVsOutsiders"
     },
     {
      "hint": "",
      "label": "Every kind on its own teams",
      "value": "separate"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "FIRST_COME",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "When the event is full",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.queue",
    "min": null,
    "hint": "Who gets a place when someone leaves.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "First come, first served",
      "value": "FIRST_COME"
     },
     {
      "hint": "",
      "label": "Clan members first",
      "value": "CLAN_FIRST"
     }
    ],
    "maxLength": null
   },
   {
    "standard": false,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Buy-in",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.buyIn.enabled",
    "min": null,
    "hint": "Players pay in-game gp to enter, and the paid total makes the pot.",
    "showWhen": null,
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": 0,
    "quick": false,
    "widget": null,
    "max": 1000000000000,
    "numeric": true,
    "label": "Buy-in amount (gp)",
    "type": "INT",
    "required": {
     "always": false,
     "when": {
      "path": "config.buyIn.enabled",
      "negate": false,
      "value": true
     }
    },
    "path": "config.buyIn.amount",
    "min": 1,
    "hint": "What each player pays.",
    "showWhen": {
     "path": "config.buyIn.enabled",
     "negate": false,
     "value": true
    },
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": true,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Show the pot to players",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.buyIn.showPot",
    "min": null,
    "hint": "Players see how much is in the pot.",
    "showWhen": {
     "path": "config.buyIn.enabled",
     "negate": false,
     "value": true
    },
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Prizes",
    "type": "PRIZES",
    "required": {
     "always": false
    },
    "path": "prizes",
    "min": null,
    "hint": "A prize goes to one place or a range of places. Optional; you can also add them later.",
    "showWhen": null,
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Signup channel",
    "type": "CHANNEL",
    "required": {
     "always": false,
     "when": {
      "path": "config.signupAdminChannelId",
      "set": true,
      "negate": false
     }
    },
    "path": "config.signupChannelId",
    "min": null,
    "hint": "Where the signup is posted for players. Choose it together with the staff channel.",
    "showWhen": null,
    "step": "DISCORD",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Signup staff channel",
    "type": "CHANNEL",
    "required": {
     "always": false,
     "when": {
      "path": "config.signupChannelId",
      "set": true,
      "negate": false
     }
    },
    "path": "config.signupAdminChannelId",
    "min": null,
    "hint": "Where staff see who signed up.",
    "showWhen": null,
    "step": "DISCORD",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "STANDARD",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Setup steps",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.setup.mode",
    "min": null,
    "hint": "Follow the steps (close signups, confirm the roster) before the event can start, or start it whenever you like.",
    "showWhen": null,
    "step": "SETUP",
    "choices": [
     {
      "hint": "",
      "label": "Follow the setup steps",
      "value": "STANDARD"
     },
     {
      "hint": "",
      "label": "Start whenever I like",
      "value": "OFF"
     }
    ],
    "maxLength": null
   },
   {
    "standard": false,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Players must be verified",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.verification.required",
    "min": null,
    "hint": "Players send proof first (for example a screenshot of what they hold) and an organiser approves it.",
    "showWhen": null,
    "step": "SETUP",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "TEAMS",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Must be verified by",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.verification.gate",
    "min": null,
    "hint": "When a player who isn't verified stops counting.",
    "showWhen": {
     "path": "config.verification.required",
     "negate": false,
     "value": true
    },
    "step": "SETUP",
    "choices": [
     {
      "hint": "They count once approved. Until then they are on the list but not in the event.",
      "label": "When they sign up",
      "value": "SIGNUP"
     },
     {
      "hint": "Anyone can sign up; players who aren't verified by then are left out of the teams unless you let them through.",
      "label": "Before teams are made (usual)",
      "value": "TEAMS"
     },
     {
      "hint": "Everyone can be in a team, but the event can't start until every player is verified, waived or removed.",
      "label": "Before the event starts",
      "value": "START"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "What players are told to send",
    "type": "TEXTAREA",
    "required": {
     "always": false
    },
    "path": "config.verification.instructions",
    "min": null,
    "hint": "Shown to players who join. Up to 1000 characters.",
    "showWhen": {
     "path": "config.verification.required",
     "negate": false,
     "value": true
    },
    "step": "SETUP",
    "choices": [],
    "maxLength": 1000
   }
  ],
  "description": "Who gains the most XP in a skill (or overall) while the event runs. Progress comes from players' linked RuneScape accounts, so nobody has to send screenshots.",
  "days": 7,
  "label": "Competition",
  "steps": [
   {
    "label": "The basics",
    "blurb": "Name the event and say what it is.",
    "key": "BASICS"
   },
   {
    "label": "When",
    "blurb": "When it starts and ends, and when signups close.",
    "key": "WHEN"
   },
   {
    "label": "The rules",
    "blurb": "What the event is made of.",
    "key": "RULES"
   },
   {
    "label": "Players",
    "blurb": "Who can take part and how they are scored.",
    "key": "PLAYERS"
   },
   {
    "label": "Buy-in and prizes",
    "blurb": "What players pay to enter and what they can win.",
    "key": "MONEY"
   },
   {
    "label": "Discord",
    "blurb": "Where signups, the board and proof go.",
    "key": "DISCORD"
   },
   {
    "label": "Setup steps and verification",
    "blurb": "How much of the setup checklist the event follows, and whether players must be verified.",
    "key": "SETUP"
   }
  ],
  "startsInHours": 24
 },
 "boss-night": {
  "template": "boss-night",
  "standard": {
   "template": "boss-night",
   "scope": "PRIVATE",
   "name": "Boss night · 17 Oct",
   "description": "",
   "startsAt": "2026-10-17T12:00:00Z",
   "scoringMode": "INDIVIDUAL",
   "config": {
    "kills": 10,
    "buyIn": {
     "showPot": true,
     "amount": 0,
     "enabled": false
    },
    "setup": {
     "mode": "STANDARD"
    },
    "pointsPerKill": 10,
    "teamPolicy": "everyone",
    "queue": "FIRST_COME",
    "verification": {
     "instructions": "",
     "gate": "TEAMS",
     "required": false
    }
   },
   "endsAt": "2026-10-24T12:00:00Z",
   "maxParticipants": 0
  },
  "options": [
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Name",
    "type": "TEXT",
    "required": {
     "always": true
    },
    "path": "name",
    "min": null,
    "hint": "What players see, at least 3 characters.",
    "showWhen": null,
    "step": "BASICS",
    "choices": [],
    "maxLength": 80
   },
   {
    "standard": "",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Description",
    "type": "TEXTAREA",
    "required": {
     "always": false
    },
    "path": "description",
    "min": null,
    "hint": "Optional. Shown to players on the event's page.",
    "showWhen": null,
    "step": "BASICS",
    "choices": [],
    "maxLength": 1000
   },
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Starts",
    "type": "DATETIME",
    "required": {
     "always": false
    },
    "path": "startsAt",
    "min": null,
    "hint": "When it is planned to start. Nothing starts by itself: an organiser starts the event.",
    "showWhen": null,
    "step": "WHEN",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Ends",
    "type": "DATETIME",
    "required": {
     "always": false
    },
    "path": "endsAt",
    "min": null,
    "hint": "When it is planned to end.",
    "showWhen": null,
    "step": "WHEN",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Signups close",
    "type": "DATETIME",
    "required": {
     "always": false
    },
    "path": "config.signupClosesAt",
    "min": null,
    "hint": "Optional. After this players can't join themselves and signups close; staff can still add late entries.",
    "showWhen": null,
    "step": "WHEN",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": true,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Boss",
    "type": "TEXT",
    "required": {
     "always": true
    },
    "path": "config.boss",
    "min": null,
    "hint": "The boss the night is for.",
    "showWhen": null,
    "step": "RULES",
    "choices": [],
    "maxLength": 40
   },
   {
    "standard": 10,
    "quick": false,
    "widget": null,
    "max": 1000,
    "numeric": true,
    "label": "Kills that count",
    "type": "INT",
    "required": {
     "always": false
    },
    "path": "config.kills",
    "min": 1,
    "hint": "Up to 1,000.",
    "showWhen": null,
    "step": "RULES",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": 10,
    "quick": false,
    "widget": null,
    "max": 100000,
    "numeric": true,
    "label": "Points per kill",
    "type": "INT",
    "required": {
     "always": false
    },
    "path": "config.pointsPerKill",
    "min": 0,
    "hint": "What each kill is worth.",
    "showWhen": null,
    "step": "RULES",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "INDIVIDUAL",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Who plays",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "scoringMode",
    "min": null,
    "hint": "Teams add up points per team.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "Solo players",
      "value": "INDIVIDUAL"
     },
     {
      "hint": "",
      "label": "Teams",
      "value": "TEAM"
     }
    ],
    "maxLength": null
   },
   {
    "standard": 0,
    "quick": false,
    "widget": null,
    "max": 1000,
    "numeric": true,
    "label": "Most players",
    "type": "INT",
    "required": {
     "always": false
    },
    "path": "maxParticipants",
    "min": 0,
    "hint": "0 for no limit. A full event gets a waitlist.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "PRIVATE",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Who can see it",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "scope",
    "min": null,
    "hint": "Only your clan sees it by default.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "Clan only",
      "value": "PRIVATE"
     },
     {
      "hint": "",
      "label": "Clan and allies",
      "value": "ALLIANCE"
     },
     {
      "hint": "",
      "label": "Everyone",
      "value": "PUBLIC"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "everyone",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Who may join and share a team",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.teamPolicy",
    "min": null,
    "hint": "Decides whether clan members, other members of this server and players from other servers may take part and play together.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "Everyone, mixed freely",
      "value": "everyone"
     },
     {
      "hint": "",
      "label": "Only this server",
      "value": "home"
     },
     {
      "hint": "",
      "label": "Clan members apart from everyone else",
      "value": "clanVsOutsiders"
     },
     {
      "hint": "",
      "label": "Every kind on its own teams",
      "value": "separate"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "FIRST_COME",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "When the event is full",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.queue",
    "min": null,
    "hint": "Who gets a place when someone leaves.",
    "showWhen": null,
    "step": "PLAYERS",
    "choices": [
     {
      "hint": "",
      "label": "First come, first served",
      "value": "FIRST_COME"
     },
     {
      "hint": "",
      "label": "Clan members first",
      "value": "CLAN_FIRST"
     }
    ],
    "maxLength": null
   },
   {
    "standard": false,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Buy-in",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.buyIn.enabled",
    "min": null,
    "hint": "Players pay in-game gp to enter, and the paid total makes the pot.",
    "showWhen": null,
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": 0,
    "quick": false,
    "widget": null,
    "max": 1000000000000,
    "numeric": true,
    "label": "Buy-in amount (gp)",
    "type": "INT",
    "required": {
     "always": false,
     "when": {
      "path": "config.buyIn.enabled",
      "negate": false,
      "value": true
     }
    },
    "path": "config.buyIn.amount",
    "min": 1,
    "hint": "What each player pays.",
    "showWhen": {
     "path": "config.buyIn.enabled",
     "negate": false,
     "value": true
    },
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": true,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Show the pot to players",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.buyIn.showPot",
    "min": null,
    "hint": "Players see how much is in the pot.",
    "showWhen": {
     "path": "config.buyIn.enabled",
     "negate": false,
     "value": true
    },
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Prizes",
    "type": "PRIZES",
    "required": {
     "always": false
    },
    "path": "prizes",
    "min": null,
    "hint": "A prize goes to one place or a range of places. Optional; you can also add them later.",
    "showWhen": null,
    "step": "MONEY",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Signup channel",
    "type": "CHANNEL",
    "required": {
     "always": false,
     "when": {
      "path": "config.signupAdminChannelId",
      "set": true,
      "negate": false
     }
    },
    "path": "config.signupChannelId",
    "min": null,
    "hint": "Where the signup is posted for players. Choose it together with the staff channel.",
    "showWhen": null,
    "step": "DISCORD",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Signup staff channel",
    "type": "CHANNEL",
    "required": {
     "always": false,
     "when": {
      "path": "config.signupChannelId",
      "set": true,
      "negate": false
     }
    },
    "path": "config.signupAdminChannelId",
    "min": null,
    "hint": "Where staff see who signed up.",
    "showWhen": null,
    "step": "DISCORD",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": null,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Screenshot review channel",
    "type": "CHANNEL",
    "required": {
     "always": false
    },
    "path": "config.reviewChannelId",
    "min": null,
    "hint": "Players send proof with /events submit; it lands here for staff.",
    "showWhen": null,
    "step": "DISCORD",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "STANDARD",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Setup steps",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.setup.mode",
    "min": null,
    "hint": "Follow the steps (close signups, confirm the roster) before the event can start, or start it whenever you like.",
    "showWhen": null,
    "step": "SETUP",
    "choices": [
     {
      "hint": "",
      "label": "Follow the setup steps",
      "value": "STANDARD"
     },
     {
      "hint": "",
      "label": "Start whenever I like",
      "value": "OFF"
     }
    ],
    "maxLength": null
   },
   {
    "standard": false,
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Players must be verified",
    "type": "BOOL",
    "required": {
     "always": false
    },
    "path": "config.verification.required",
    "min": null,
    "hint": "Players send proof first (for example a screenshot of what they hold) and an organiser approves it.",
    "showWhen": null,
    "step": "SETUP",
    "choices": [],
    "maxLength": null
   },
   {
    "standard": "TEAMS",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "Must be verified by",
    "type": "CHOICE",
    "required": {
     "always": false
    },
    "path": "config.verification.gate",
    "min": null,
    "hint": "When a player who isn't verified stops counting.",
    "showWhen": {
     "path": "config.verification.required",
     "negate": false,
     "value": true
    },
    "step": "SETUP",
    "choices": [
     {
      "hint": "They count once approved. Until then they are on the list but not in the event.",
      "label": "When they sign up",
      "value": "SIGNUP"
     },
     {
      "hint": "Anyone can sign up; players who aren't verified by then are left out of the teams unless you let them through.",
      "label": "Before teams are made (usual)",
      "value": "TEAMS"
     },
     {
      "hint": "Everyone can be in a team, but the event can't start until every player is verified, waived or removed.",
      "label": "Before the event starts",
      "value": "START"
     }
    ],
    "maxLength": null
   },
   {
    "standard": "",
    "quick": false,
    "widget": null,
    "max": null,
    "numeric": false,
    "label": "What players are told to send",
    "type": "TEXTAREA",
    "required": {
     "always": false
    },
    "path": "config.verification.instructions",
    "min": null,
    "hint": "Shown to players who join. Up to 1000 characters.",
    "showWhen": {
     "path": "config.verification.required",
     "negate": false,
     "value": true
    },
    "step": "SETUP",
    "choices": [],
    "maxLength": 1000
   }
  ],
  "description": "A signup for an evening of one boss. Count kills per player or team, with proof or by an organiser, on top of the usual teams, buy-ins and prizes.",
  "days": 7,
  "label": "Boss night",
  "steps": [
   {
    "label": "The basics",
    "blurb": "Name the event and say what it is.",
    "key": "BASICS"
   },
   {
    "label": "When",
    "blurb": "When it starts and ends, and when signups close.",
    "key": "WHEN"
   },
   {
    "label": "The rules",
    "blurb": "What the event is made of.",
    "key": "RULES"
   },
   {
    "label": "Players",
    "blurb": "Who can take part and how they are scored.",
    "key": "PLAYERS"
   },
   {
    "label": "Buy-in and prizes",
    "blurb": "What players pay to enter and what they can win.",
    "key": "MONEY"
   },
   {
    "label": "Discord",
    "blurb": "Where signups, the board and proof go.",
    "key": "DISCORD"
   },
   {
    "label": "Setup steps and verification",
    "blurb": "How much of the setup checklist the event follows, and whether players must be verified.",
    "key": "SETUP"
   }
  ],
  "startsInHours": 24
 }
};
