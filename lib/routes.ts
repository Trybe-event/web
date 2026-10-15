// Top-level paths that can never be event slugs, because the app or platform owns them.
// The API refuses to generate these slugs too (api#4).
export const RESERVED_SLUGS = new Set([
  "api",
  "admin",
  "organizer",
  "attendee",
  "account",
  "profile",
  "events",
  "sign-in",
  "sign-up",
  "dev",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
]);

export const SLUG_PATTERN = /^[a-z0-9-]{3,80}$/;

export function isEventSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !RESERVED_SLUGS.has(slug);
}

export const routes = {
  home: "/",
  eventLanding: (slug: string) => `/${slug}`,
  eventWorkspace: (slug: string) => `/events/${slug}`,
  attendeeHome: "/attendee",
  attendeeSignIn: "/attendee/sign-in",
  attendeeSignUp: "/attendee/sign-up",
  attendeeProfile: "/attendee/profile",
  organizerHome: "/organizer",
  organizerSignIn: "/organizer/sign-in",
  organizerSignUp: "/organizer/sign-up",
  accountSetup: "/account/setup",
} as const;
