// Pure mapping from event-link API outcomes to the registration state screens
// (web#10). Deliberately JSX-free so the copy rules below are covered by plain
// node tests: the unknown-event screen must be ONE identical screen whether the
// slug is mistyped, the event is a draft, or it is private (PRD §12).

export type EventLinkStateKey =
  "unknown" | "unavailable" | "not_open" | "closed" | "joined";

export type EventLinkAction =
  | { kind: "link"; label: string; href: string }
  | { kind: "refresh"; label: string };

export type EventLinkScreen = {
  key: EventLinkStateKey;
  title: string;
  body: string;
  action: EventLinkAction;
};

export type WindowState = "not_open" | "open" | "closed";

export type EventApiOutcome =
  // GET /e/{slug} answered: the event object is never rendered on failure paths.
  | { kind: "lookup"; httpStatus: number; code: string }
  // The request never got a sensible answer (network, timeout, upstream 5xx).
  | { kind: "unreachable" }
  // GET /e/{slug} succeeded; the page renders the event, or the state screens.
  | { kind: "published"; registrationState: WindowState }
  // POST /e/{slug}/join returned conflict: the caller is already a member.
  | { kind: "already-member" };

const unknownScreen: EventLinkScreen = {
  key: "unknown",
  title: "This link doesn’t reach a registration page.",
  body: "It may be mistyped or out of date. Check the link you were given, or head back to the Trybe home.",
  action: { kind: "link", label: "Go to the Trybe home", href: "/" },
};

const unavailableScreen: EventLinkScreen = {
  key: "unavailable",
  title: "We couldn’t load this event right now.",
  body: "Try again in a moment. We could not confirm this invitation right now.",
  action: { kind: "refresh", label: "Try again" },
};

export function eventLinkScreen(
  outcome: EventApiOutcome,
  slug?: string | null,
): EventLinkScreen {
  if (outcome.kind === "already-member")
    return {
      key: "joined",
      title: "You’re already in this event.",
      body: "You don’t need to register again. Everything is in your event workspace.",
      action: {
        kind: "link",
        label: "Open the event",
        href: slug ? `/events/${slug}` : "/",
      },
    };

  if (outcome.kind === "published") {
    if (outcome.registrationState === "not_open")
      return {
        key: "not_open",
        title: "Registration hasn’t opened yet.",
        body: "The link is fine, but registration opens later. In the meantime you can set up your Trybe profile.",
        action: {
          kind: "link",
          label: "Set up your profile",
          href: "/attendee",
        },
      };
    if (outcome.registrationState === "closed")
      return {
        key: "closed",
        title: "Registration has closed for this event.",
        body: "The link still works; the event just isn’t taking new registrations. There are other events to explore.",
        action: { kind: "link", label: "Explore Trybe", href: "/" },
      };
  }

  // 404 from the public endpoint covers unknown, draft and private events with
  // the same screen — never a separate "this event exists" message.
  if (
    outcome.kind === "lookup" &&
    outcome.httpStatus === 404 &&
    outcome.code === "not_found"
  )
    return unknownScreen;

  if (outcome.kind === "lookup" || outcome.kind === "unreachable")
    return unavailableScreen;

  throw new Error("An event link outcome was never reached.");
}
