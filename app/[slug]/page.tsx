import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JoinEvent } from "@/components/events/join-event";
import { JoinReview } from "@/components/events/join-review";
import { ButtonLink } from "@/components/ui";
import {
  getJoinPreview,
  getPublicEvent,
  hasEventMembership,
  type JoinPreviewResult,
} from "@/lib/events";
import { isEventSlug, routes, withEventParam } from "@/lib/routes";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Event" };

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
  // Without Clerk keys there is no session to read and no sign-in to offer, so the
  // page stays a public notice; the join links still carry the slug.
  const result =
    session.kind === "unconfigured" ? null : await getPublicEvent(slug);
  if (result?.kind === "not_found") notFound();

  const event = result?.kind === "found" ? result.event : null;
  const attendee =
    session.kind === "bound" && session.account.type === "attendee";
  const member = attendee ? await hasEventMembership(slug) : false;
  // Only an attendee who is not in the event yet has anything to review.
  const preview = attendee && !member ? await getJoinPreview(slug) : null;
  const name = event?.name ?? slug;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">{name}</h1>
      {event ? (
        <>
          <p className="mt-3 text-muted">
            {[
              FORMAT_LABELS[event.format],
              new Date(event.starts_at).toLocaleDateString("en-GB", {
                dateStyle: "long",
                timeZone: event.timezone,
              }),
              event.venue_name,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {event.summary && <p className="mt-4">{event.summary}</p>}
        </>
      ) : (
        <p className="mt-3 text-muted">
          {result?.kind === "unavailable"
            ? "This event's details are temporarily unavailable."
            : "The full event landing page arrives in M2."}{" "}
          This event is at <code>/{slug}</code>.
        </p>
      )}

      <EventAction
        slug={slug}
        name={name}
        member={member}
        attendee={attendee}
        sessionKind={session.kind}
        preview={preview}
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
}: {
  slug: string;
  name: string;
  member: boolean;
  attendee: boolean;
  sessionKind: string;
  preview: JoinPreviewResult | null;
}) {
  if (attendee && member)
    return (
      <div className="mt-8">
        <ButtonLink href={routes.eventWorkspace(slug)}>
          Open your event workspace
        </ButtonLink>
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
    // The API couldn't provide the review. Joining stays possible and is idempotent,
    // and the API is the authority on whether this attendee may join.
    return (
      <div className="mt-8">
        <JoinEvent slug={slug} name={name} />
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
