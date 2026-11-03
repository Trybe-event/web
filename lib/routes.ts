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
  "event-artwork",
  "event-images",
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

// The join flow carries an event slug as a query parameter: the sign-up and sign-in
// routes are Clerk's catch-all, so an extra path segment would collide with Clerk's
// own steps. parseEventParam ignores anything that isn't a real event slug.
export const EVENT_PARAM = "event";

export function parseEventParam(
  value: string | string[] | undefined,
): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && isEventSlug(raw) ? raw : undefined;
}

export function withEventParam(path: string, slug?: string): string {
  if (!slug) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}${EVENT_PARAM}=${encodeURIComponent(slug)}`;
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
