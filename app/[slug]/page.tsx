import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JoinReview } from "@/components/events/join-review";
import { ProgramView } from "@/components/events/program-view";
import { EventLinkState } from "@/components/registration/event-link-states";
import { ButtonLink } from "@/components/ui";
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
  const unavailable: Metadata = {
    title: "Event invitation",
    robots: { index: false, follow: false },
  };
  if (!isEventSlug(slug)) return unavailable;
  const result = await getPublicEvent(slug);
  if (result.kind !== "found") return unavailable;
  const { event } = result;
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
  if (!isEventSlug(slug)) notFound();

  const session = await getSession();
  const result = await getPublicEvent(slug);
  if (result.kind === "not_found")
    return (
      <EventLinkState
        outcome={{ kind: "lookup", httpStatus: 404, code: "not_found" }}
      />
    );
  if (result.kind === "unavailable")
    return <EventLinkState outcome={{ kind: "unreachable" }} />;
  const event = result.event;
  const attendee =
    session.kind === "bound" && session.account.type === "attendee";
  const member = attendee ? await hasEventMembership(slug) : false;
  // Only an attendee who is not in the event yet has anything to review.
  const preview = attendee && !member ? await getJoinPreview(slug) : null;
  const name = event.name;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">{name}</h1>
      <p className="mt-3 text-muted">
        {[
          FORMAT_LABELS[event.format],
          new Date(event.starts_at).toLocaleString("en-GB", {
            dateStyle: "long",
            timeStyle: "short",
            timeZone: event.timezone,
          }),
          event.venue_name,
        ]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p className="mt-2 text-sm text-muted">
        Ends{" "}
        {new Date(event.ends_at).toLocaleString("en-GB", {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: event.timezone,
        })}{" "}
        ({event.timezone})
      </p>
      {event.summary && <p className="mt-4">{event.summary}</p>}
      {event.description && (
        <p className="mt-4 whitespace-pre-wrap">{event.description}</p>
      )}
      {event.venue_address && (
        <p className="mt-3 text-muted">{event.venue_address}</p>
      )}
      <section className="mt-8 space-y-4" aria-label="Event program">
        <h2 className="text-xl font-bold">Program</h2>
        <ProgramView
          program={event.program ?? { days: [] }}
          timezone={event.timezone}
        />
      </section>

      <EventAction
        slug={slug}
        name={name}
        member={member}
        attendee={attendee}
        sessionKind={session.kind}
        preview={preview}
        registrationState={event.registration_state}
      />
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
  member: boolean;
  attendee: boolean;
  sessionKind: string;
  preview: JoinPreviewResult | null;
  registrationState: "not_open" | "open" | "closed";
}) {
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

  return (
    <div className="mt-8 flex flex-col items-start gap-3">
      <ButtonLink href={withEventParam(routes.attendeeSignUp, slug)}>
        Join this event
      </ButtonLink>
      <Link href={withEventParam(routes.attendeeSignIn, slug)}>
        I already have an account
      </Link>
    </div>
  );
}
