import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { JoinEvent } from "@/components/events/join-event";
import { ButtonLink } from "@/components/ui";
import { getPublicEvent, isEventMember } from "@/lib/events";
import { isEventSlug, routes, withEventParam } from "@/lib/routes";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Event" };

const FORMAT_LABELS = {
  physical: "In person",
  virtual: "Online",
  hybrid: "In person and online",
} as const;

// Public event landing page (web#6) with the join step (web#7): a signed-out visitor
// is sent to sign-up or sign-in carrying the slug, and an attendee joins here.
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
  const member = attendee ? await isEventMember(slug) : false;
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

      <div className="mt-8 flex flex-col items-start gap-3">
        {attendee ? (
          member ? (
            <ButtonLink href={routes.eventWorkspace(slug)}>
              Open your event workspace
            </ButtonLink>
          ) : (
            <JoinEvent slug={slug} name={name} />
          )
        ) : session.kind === "bound" ? (
          <p className="text-sm text-muted">
            Organizer accounts don&apos;t join events.{" "}
            <Link href={withEventParam(routes.attendeeSignIn, slug)}>
              Sign in with an attendee account
            </Link>{" "}
            to join this one.
          </p>
        ) : (
          <>
            <ButtonLink href={withEventParam(routes.attendeeSignUp, slug)}>
              Join this event
            </ButtonLink>
            <Link href={withEventParam(routes.attendeeSignIn, slug)}>
              I already have an account
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
