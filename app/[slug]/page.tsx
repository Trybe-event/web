import type { Metadata } from "next";
import {
  CalendarDays,
  MapPin,
  Globe,
  Building2,
  CalendarClock,
} from "lucide-react";
import Link from "next/link";
import { EventSharing } from "@/components/events/event-sharing";
import { artworkPath } from "@/lib/event-artwork";
import { EventHero } from "@/components/events/event-hero";
import { ThemeToggle } from "@/components/auth/theme-toggle";
import { EventRegistration } from "@/components/events/event-registration";
import { notFound, redirect } from "next/navigation";

import { JoinReview } from "@/components/events/join-review";
import { ProgramView } from "@/components/events/program-view";
import { EventLinkState } from "@/components/registration/event-link-states";
import { ButtonLink, Logo } from "@/components/ui";
import {
  getJoinPreview,
  getPublicEvent,
  hasEventMembership,
  type JoinPreviewResult,
} from "@/lib/events";
import { isEventSlug, routes, withEventParam } from "@/lib/routes";
import { getSession } from "@/lib/session";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const missing: Metadata = {
    title: "404 page",
    robots: { index: false, follow: false },
  };
  const unavailable: Metadata = {
    title: "Event invitation",
    robots: { index: false, follow: false },
  };
  if (!isEventSlug(slug)) return missing;
  const result = await getPublicEvent(slug);
  if (result.kind === "not_found") return missing;
  if (result.kind !== "found") return unavailable;
  const { event } = result;
  const eventUrl = new URL(
    `/${slug}`,
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ).href;
  const previewImage = new URL(artworkPath(slug), eventUrl).href;
  // PublicEvent does not expose visibility. Keep every invitation unindexed so a
  // private event cannot accidentally become searchable through this shared route.
  return {
    title: event.name,
    description:
      event.summary ||
      "Set up your profile, explore the program, and meet the right people.",
    robots: { index: false, follow: false },
    openGraph: {
      title: event.name,
      description: event.summary || "Meet the right people at this event.",
      type: "website",
      url: eventUrl,
      images: [
        { url: previewImage, width: 1200, height: 630, alt: event.name },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: event.name,
      description: event.summary || "Meet the right people at this event.",
      images: [previewImage],
    },
  };
}

const FORMAT_LABELS = {
  physical: "In person",
  virtual: "Online",
  hybrid: "In person and online",
} as const;

// Public event landing page (web#6) with the join flow (web#7, web#8). Reading this
// page never registers anyone: membership only changes when the attendee confirms.
export default async function EventLanding({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (/^[a-z0-9]{6}$/i.test(slug) && slug !== slug.toLowerCase())
    redirect(`/${slug.toLowerCase()}`);
  if (!isEventSlug(slug)) notFound();

  const session = await getSession();
  const result = await getPublicEvent(slug);
  if (result.kind === "not_found") notFound();
  if (result.kind === "unavailable")
    return <EventLinkState outcome={{ kind: "unreachable" }} />;
  const event = result.event;
  const attendee =
    session.kind === "bound" && session.account.type === "attendee";
  const member = attendee ? await hasEventMembership(slug) : false;
  // Only an attendee who is not in the event yet has anything to review.
  const preview =
    attendee && member === false ? await getJoinPreview(slug) : null;
  const name = event.name;
  const shareUrl = new URL(
    `/${slug}`,
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ).href;

  return (
    <main className="w-full px-4 py-6 sm:px-6 sm:py-10">
      <header className="sticky top-0 z-40 -mx-4 mb-5 flex items-center justify-between gap-4 border-b border-line/60 bg-paper/75 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <Link href="/" aria-label="Trybe home">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="#join-event"
            className="rounded-full bg-ink px-5 py-2 text-sm font-semibold text-paper lg:hidden"
          >
            Join the event
          </a>
        </div>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(21rem,1fr)] lg:gap-8">
        <div className="contents lg:block lg:min-w-0 lg:space-y-6">
          <div className="row-start-1">
            <EventHero
              name={name}
              date={new Date(event.starts_at).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: event.timezone,
              })}
              venue={event.venue_name || FORMAT_LABELS[event.format]}
              image={event.image_url}
            />
          </div>
          <section
            className="row-start-3 rounded-3xl border border-line bg-paper p-5 sm:p-7 lg:row-auto"
            aria-labelledby="event-title"
          >
            <h1
              id="event-title"
              className="font-display text-2xl font-bold sm:text-3xl"
            >
              {name}
            </h1>
            <EventSharing slug={slug} name={name} url={shareUrl} />
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm leading-relaxed">
              <p className="flex items-start gap-2">
                <CalendarDays
                  aria-hidden="true"
                  size={16}
                  className="mt-0.5 shrink-0 text-accent-ink"
                />
                <span>
                  {new Date(event.starts_at).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: event.timezone,
                  })}{" "}
                  to{" "}
                  {new Date(event.ends_at).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: event.timezone,
                  })}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <Globe
                  aria-hidden="true"
                  size={16}
                  className="mt-0.5 shrink-0 text-accent-ink"
                />
                <span>
                  {
                    new Intl.DateTimeFormat("en-GB", {
                      timeZone: event.timezone,
                      timeZoneName: "shortOffset",
                    })
                      .formatToParts(new Date(event.starts_at))
                      .find((part) => part.type === "timeZoneName")?.value
                  }{" "}
                  · {FORMAT_LABELS[event.format]}
                </span>
              </p>
              {(event.venue_name || event.venue_address) && (
                <p className="flex items-start gap-2">
                  <MapPin
                    aria-hidden="true"
                    size={16}
                    className="mt-0.5 shrink-0 text-accent-ink"
                  />
                  <span>
                    {[event.venue_name, event.venue_address]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </p>
              )}
              {event.organizer_name && (
                <p className="flex items-start gap-2">
                  <Building2
                    aria-hidden="true"
                    size={16}
                    className="mt-0.5 shrink-0 text-accent-ink"
                  />
                  <span>
                    Organized by <strong>{event.organizer_name}</strong>
                  </span>
                </p>
              )}
              {event.registration_closes_at && (
                <p className="flex w-full items-start gap-2 font-medium text-accent-ink">
                  <CalendarClock
                    aria-hidden="true"
                    size={16}
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    Registration closes{" "}
                    {new Date(event.registration_closes_at).toLocaleString(
                      "en-GB",
                      {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: event.timezone,
                      },
                    )}
                  </span>
                </p>
              )}
            </div>
            <h2 className="mt-6 text-lg font-bold">About this event</h2>
            {event.summary && (
              <p className="mt-3 leading-relaxed">{event.summary}</p>
            )}
            {event.description && (
              <p className="mt-4 whitespace-pre-wrap leading-relaxed text-muted">
                {event.description}
              </p>
            )}
          </section>
          <section
            className="row-start-4 space-y-4 rounded-3xl border border-line bg-paper p-5 sm:p-7"
            aria-label="Event program"
          >
            <h2 className="text-xl font-bold">Program</h2>
            <ProgramView
              program={event.program ?? { days: [] }}
              timezone={event.timezone}
            />
          </section>
        </div>
        <aside
          id="join-event"
          className="row-start-2 scroll-mt-6 rounded-3xl border border-line bg-paper p-5 sm:p-7 lg:sticky lg:top-24 lg:col-start-2 lg:row-start-1 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto"
        >
          <EventAction
            slug={slug}
            name={name}
            member={member}
            attendee={attendee}
            sessionKind={session.kind}
            preview={preview}
            registrationState={event.registration_state}
          />
        </aside>
      </div>
    </main>
  );
}

// EventAction is the one decision this page makes for the visitor: an attendee already
// in gets their workspace, an attendee who isn't reviews and confirms, an organizer is
// pointed at an attendee account, and anyone signed out signs up or in carrying the
// event. Nothing here writes without an explicit press.
function EventAction({
  slug,
  name,
  member,
  attendee,
  sessionKind,
  preview,
  registrationState,
}: {
  slug: string;
  name: string;
  member: boolean | null;
  attendee: boolean;
  sessionKind: string;
  preview: JoinPreviewResult | null;
  registrationState: "not_open" | "open" | "closed";
}) {
  if (attendee && member === null)
    return <EventLinkState outcome={{ kind: "unreachable" }} />;

  if (
    attendee &&
    (member || (preview?.kind === "review" && preview.preview.alreadyMember))
  )
    return (
      <div className="mt-8">
        <ButtonLink href={routes.eventWorkspace(slug)}>
          Open your event workspace
        </ButtonLink>
      </div>
    );

  if (registrationState !== "open")
    return (
      <EventLinkState
        outcome={{ kind: "published", registrationState }}
        slug={slug}
      />
    );

  if (sessionKind === "unavailable" || sessionKind === "unconfigured")
    return (
      <div className="mt-8">
        <EventLinkState outcome={{ kind: "unreachable" }} />
      </div>
    );

  if (attendee && preview?.kind === "review")
    return (
      <div className="mt-8 flex flex-col gap-6">
        <JoinReview slug={slug} name={name} preview={preview.preview} />
      </div>
    );

  if (attendee && preview?.kind === "needs_profile")
    return (
      <div className="mt-8 flex flex-col items-start gap-3">
        <p className="text-sm text-muted">
          Create your profile before you join {name}. It is the profile everyone
          at the event will see, and you only join when you confirm.
        </p>
        <ButtonLink
          href={withEventParam("/attendee/profile/edit?onboarding=1", slug)}
        >
          Create your profile
        </ButtonLink>
      </div>
    );

  if (attendee)
    return (
      <div className="mt-8">
        <EventLinkState outcome={{ kind: "unreachable" }} />
      </div>
    );

  if (sessionKind === "bound")
    return (
      <p className="mt-8 text-sm text-muted">
        Organizer accounts don&apos;t join events.{" "}
        <Link href={withEventParam(routes.attendeeSignIn, slug)}>
          Sign in with an attendee account
        </Link>{" "}
        to join this one.
      </p>
    );

  if (sessionKind === "unbound")
    return (
      <ButtonLink href={withEventParam(routes.accountSetup, slug)}>
        Continue to join the event
      </ButtonLink>
    );

  return <EventRegistration slug={slug} />;
}
