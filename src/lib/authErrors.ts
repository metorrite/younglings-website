/**
 * What to tell someone when signing in with Discord fails. next-auth reports a short code in the address (`?error=OAuthCallback`);
 * these are the plain-language versions, with things worth trying, for the sign-in page.
 */
export interface AuthErrorInfo {
  title: string;
  what: string;
  tips: string[];
}

const TRY_AGAIN = "Press the sign-in button again; a second try often works.";
const CLEAR = "Open the site in a private/incognito window, or clear this site's cookies, and try once more.";

const ERRORS: Record<string, AuthErrorInfo> = {
  OAuthCallback: {
    title: "Discord sign-in didn't finish",
    what: "Discord let you through, but the last step of signing you in on our side failed.",
    tips: [TRY_AGAIN, CLEAR, "Make sure you only have one sign-in tab open, and don't use the back button during sign-in."],
  },
  Callback: {
    title: "Discord sign-in didn't finish",
    what: "Discord let you through, but the last step of signing you in on our side failed.",
    tips: [TRY_AGAIN, CLEAR],
  },
  OAuthSignin: {
    title: "Couldn't start the Discord sign-in",
    what: "We couldn't hand you over to Discord to sign in.",
    tips: [TRY_AGAIN, "Check Discord isn't having an outage at discordstatus.com."],
  },
  OAuthCreateAccount: {
    title: "Couldn't finish signing you in",
    what: "Discord signed you in, but we couldn't set up your session.",
    tips: [TRY_AGAIN, CLEAR],
  },
  OAuthAccountNotLinked: {
    title: "That Discord account can't be used here",
    what: "This sign-in is tied to a different account from the one you chose.",
    tips: ["Sign in with the Discord account you used before."],
  },
  AccessDenied: {
    title: "You cancelled the sign-in",
    what: "Discord was told not to let JonnyBot see who you are, so you weren't signed in.",
    tips: ["Press the sign-in button and choose Authorize on Discord's screen. We only ask who you are (your name and avatar)."],
  },
  SessionRequired: {
    title: "You need to sign in first",
    what: "That page is for signed-in members.",
    tips: ["Sign in with Discord below and you'll be taken back."],
  },
  Configuration: {
    title: "Sign-in isn't set up properly right now",
    what: "Something is wrong on our side with the sign-in settings.",
    tips: ["Try again in a few minutes.", "If it keeps happening, send the troubleshooting file below to the site's admin."],
  },
  Verification: {
    title: "That sign-in link has expired",
    what: "The link or code you used is no longer valid.",
    tips: [TRY_AGAIN],
  },
  Default: {
    title: "Something went wrong signing in",
    what: "Signing in with Discord didn't work, and we're not sure why.",
    tips: [TRY_AGAIN, CLEAR, "If it keeps happening, send the troubleshooting file below to the site's admin."],
  },
};

/** The code to show for whatever the address said: a known one, or the general one. Never echoes arbitrary text from the address. */
export function authErrorCode(raw: string | undefined): string {
  return raw && Object.prototype.hasOwnProperty.call(ERRORS, raw) ? raw : "Default";
}

export function authError(code: string): AuthErrorInfo {
  return ERRORS[code] ?? ERRORS.Default;
}
