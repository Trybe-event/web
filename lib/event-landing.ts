// Pure presentation rules for the public event landing page (web#6): what the
// registration banner says, how the program is grouped for visitors, which
// action a session type gets, and what link previews carry. No JSX and no API
// access, so every rule here is covered by plain node tests.

import type { Metadata } from "next";

import type { components } from "./api/schema";
import { eventLinkScreen, type WindowState } from "./registration/link-states";

export type PublicEvent = components["schemas"]["PublicEvent"];

export type LandingBanner = {
  tone: "success" | "neutral";
  title: string;
  body: string | null;
  action: { label: string; href: string } | null;
};

// registrationBanner states the registration availability on the page (web#6).
// "open" is the positive banner; the shut states reuse web#10's tested copy and
// next action verbatim, so the banner and the event-link state screens can
// never say two different things about the same window.
export function registrationBanner(
  registrationState: WindowState,
): LandingBanner {
  if (registrationState === "open")
    return {
      tone: "success",
      title: "Registration is open.",
      body: null,
      action: null,
    };
  const screen = eventLinkScreen({
    kind: "published",
    registrationState,
  });
  return {
    tone: "neutral",
    title: screen.title,
    body: screen.body,
    action:
      screen.action.kind === "link"
        ? { label: screen.action.label, href: screen.action.href }
        : null,
  };
}

// acceptsRegistrations is the rule behind every join button: only an open
// window offers one. A null state means no event was loaded (the app runs
// without Clerk keys), where the page still offers the sign-up links.
export function acceptsRegistrations(
  registrationState: WindowState | null,
): boolean {
  return registrationState === null || registrationState === "open";
}

export type LandingSessionKind =
  "unconfigured" | "signed-out" | "attendee" | "organizer";

export type LandingAction =
  | "workspace" // attendee already in the event
  | "organizer_note" // a non-attendee session is told why there is no join
  | "none" // registration is shut; the banner carries the state
  | "review" // returning attendee: review the saved profile, then confirm
  | "create_profile" // attendee without a profile yet
  | "join" // attendee, preview unavailable: idempotent join stays available
  | "register"; // signed out or no keys: the sign-up entry points

// landingAction is the one decision the page makes per visitor. Order matters:
// a member keeps their workspace whatever the window says, an organizer never
// gets a join action, and nothing offers a press while registration is shut.
export function landingAction(input: {
  session: LandingSessionKind;
  member: boolean;
  registrationOpen: boolean;
  preview: "review" | "needs_profile" | "unavailable";
}): LandingAction {
  const { session, member, registrationOpen, preview } = input;
  if (session === "attendee" && member) return "workspace";
  if (session === "organizer") return "organizer_note";
  if (!registrationOpen) return "none";
  if (session === "attendee") {
    if (preview === "review") return "review";
    if (preview === "needs_profile") return "create_profile";
    return "join";
  }
  return "register";
}

export type LandingSpeaker = {
  key: string;
  name: string;
  role: string | null;
  organization: string | null;
  bio: string | null;
};

export type LandingSession = {
  key: string;
  time: string;
  title: string;
  track: string | null;
  room: string | null;
  speakerNames: string[];
};

export type LandingDay = {
  key: string;
  label: string;
  sessions: LandingSession[];
};

const validTimezone = (timeZone: string): string => {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return timeZone;
  } catch {
    return "UTC";
  }
};

const timeIn = (instant: string, timeZone: string): string => {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone,
    });
  } catch {
    return date.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  }
};

// timeRange renders "09:00–17:00" in the event's own timezone.
export function timeRange(
  startsAt: string,
  endsAt: string,
  timeZone: string,
): string {
  const start = timeIn(startsAt, timeZone);
  const end = timeIn(endsAt, timeZone);
  return start && end ? `${start}–${end}` : start || end;
}

const dayLabel = (date: string, title: string | null | undefined): string => {
  if (title) return title;
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!parts) return date;
  // The value is a calendar day, not an instant: label it literally so no
  // timezone can move the day backwards or forwards.
  const day = new Date(
    Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])),
  );
  if (Number.isNaN(day.getTime())) return date;
  return day.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

// landingProgram groups the program by day for the page: days in position
// order with a readable label, sessions in position order with their time in
// the event's timezone, track, room and speaker names.
export function landingProgram(event: PublicEvent): LandingDay[] {
  const timeZone = validTimezone(event.timezone);
  const days = [...(event.program?.days ?? [])].sort(
    (first, second) => first.position - second.position,
  );
  return days.map((day) => ({
    key: day.id,
    label: dayLabel(day.date, day.title),
    sessions: [...day.sessions]
      .sort((first, second) => first.position - second.position)
      .map((session) => ({
        key: session.id,
        time: timeRange(session.starts_at, session.ends_at, timeZone),
        title: session.title,
        track: session.track ?? null,
        room: session.room ?? null,
        speakerNames: (session.speakers ?? []).map((speaker) => speaker.name),
      })),
  }));
}

// landingSpeakers lists each speaker once across the whole program: someone
// speaking twice appears once, keeping the first bio the organizer entered.
export function landingSpeakers(event: PublicEvent): LandingSpeaker[] {
  const seen = new Map<string, LandingSpeaker>();
  for (const day of event.program?.days ?? [])
    for (const session of day.sessions)
      for (const speaker of session.speakers ?? []) {
        const name = speaker.name.trim();
        if (!name) continue;
        const key = `${name.toLowerCase()}|${(speaker.organization ?? "")
          .trim()
          .toLowerCase()}`;
        if (!seen.has(key))
          seen.set(key, {
            key,
            name,
            role: speaker.role ?? null,
            organization: speaker.organization ?? null,
            bio: speaker.bio ?? null,
          });
      }
  // Array.from rather than a spread: this module is transpiled by the node
  // test harness, where a downleveled spread over an iterator drops entries.
  return Array.from(seen.values());
}

// scheduleLine is the header's schedule in the event's own timezone:
// "Sunday 1 November 2026 · 09:00–17:00 (UTC)", or the day range when the
// event spans more than one day.
export function scheduleLine(event: PublicEvent): string {
  const timeZone = validTimezone(event.timezone);
  const dayFormat: Intl.DateTimeFormatOptions = {
    dateStyle: "full",
    timeZone,
  };
  const startDay = new Date(event.starts_at).toLocaleDateString(
    "en-GB",
    dayFormat,
  );
  const endDay = new Date(event.ends_at).toLocaleDateString("en-GB", dayFormat);
  const span =
    startDay === endDay
      ? `${startDay} · ${timeRange(event.starts_at, event.ends_at, timeZone)}`
      : `${startDay} – ${endDay}`;
  // The label names the timezone the times were actually read in, so an
  // unexpected value falls back to UTC in both places at once.
  return `${span} (${timeZone})`;
}

// descriptionParagraphs splits the organizer's description on blank lines so
// long copy renders as paragraphs rather than one wall of text.
export function descriptionParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

// landingMetadata feeds the link preview (web#6): social tags come from the
// event itself, and a page without event data keeps the generic title instead
// of claiming details it doesn't have.
export function landingMetadata(
  event: PublicEvent | null,
  slug: string,
): Metadata {
  if (!event) return { title: "Event" };
  const raw = (event.summary || event.description || "").trim();
  const description = raw ? raw.slice(0, 300) : undefined;
  return {
    title: event.name,
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      type: "website",
      url: `/${slug}`,
      title: event.name,
      description,
      ...(event.image_url ? { images: [{ url: event.image_url }] } : {}),
    },
  };
}
