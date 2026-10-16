import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { JoinEvent } from "@/components/events/join-event";
import { JoinReview } from "@/components/events/join-review";
import { EventLinkState } from "@/components/registration/event-link-states";
import { Badge, ButtonLink } from "@/components/ui";
import { authConfigured } from "@/lib/auth-config";
import {
  acceptsRegistrations,
  descriptionParagraphs,
  landingAction,
  landingMetadata,
  landingProgram,
  landingSpeakers,
  registrationBanner,
  scheduleLine,
  type LandingAction,
  type LandingBanner,
  type LandingSessionKind,
} from "@/lib/event-landing";
import {
  getJoinPreview,
  getPublicEvent,
  hasEventMembership,
  type JoinPreviewResult,
  type PublicEventResult,
} from "@/lib/events";
import { isEventSlug, routes, withEventParam } from "@/lib/routes";
import { getSession } from "@/lib/session";
import type { EventApiOutcome } from "@/lib/registration/link-states";

const FORMAT_LABELS = {
  physical: "In person",
  virtual: "Online",
  hybrid: "In person and online",
} as const;

// loadEvent reads the event once per request: generateMetadata and the page
// below share the same answer through React's cache. Without Clerk keys this
// environment is a public notice only and the API is never asked, so the page
// still renders (and still offers its links) with no backend at all.
const loadEvent = cache(
  async (slug: string): Promise<PublicEventResult | null> => {
    if (!authConfigured()) return null;
    return getPublicEvent(slug);
  },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isEventSlug(slug)) return { title: "Event" };
  const result = await loadEvent(slug);
  return landingMetadata(result?.kind === "found" ? result.event : null, slug);
}

// Public event landing page (web#6) with the join flow (web#7, web#8). Reading
// this page never registers anyone: membership only changes when the attendee
// confirms. Every failure path of the link renders web#10's shared state
// screen, whose copy never reveals whether a private or draft event exists.
export default async function EventLanding({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isEventSlug(slug)) notFound();

  const [session, result] = await Promise.all([getSession(), loadEvent(slug)]);
  if (result?.kind === "not_found")
    return (
      <LinkStatePage
        outcome={{ kind: "lookup", httpStatus: 404, code: "not_found" }}
      />
    );
  if (result?.kind === "unavailable")
    return <LinkStatePage outcome={{ kind: "unreachable" }} />;

  const event = result?.kind === "found" ? result.event : null;
  const attendee =
    session.kind === "bound" && session.account.type === "attendee";
  const member = attendee ? await hasEventMembership(slug) : false;
  // Only an attendee who is not in the event yet has anything to review.
  const preview = attendee && !member ? await getJoinPreview(slug) : null;
  const name = event?.name ?? slug;
  const registrationOpen = acceptsRegistrations(
    event?.registration_state ?? null,
  );
  // Only a bound session carries an account type. Signed-out, not-yet-bound
  // and API-unreachable sessions all take the sign-up entry points, exactly as
  // this page behaved before it could load event data.
  const sessionKind: LandingSessionKind =
    session.kind === "bound"
      ? session.account.type
      : session.kind === "unconfigured"
        ? "unconfigured"
        : "signed-out";
  const action = landingAction({
    session: sessionKind,
    member,
    registrationOpen,
    preview:
      preview?.kind === "review"
        ? "review"
        : preview?.kind === "needs_profile"
          ? "needs_profile"
          : "unavailable",
  });

  const days = event ? landingProgram(event) : [];
  const speakers = event ? landingSpeakers(event) : [];
  const banner = event ? registrationBanner(event.registration_state) : null;
  const location = event
    ? [event.venue_name, event.venue_address, event.attendance_url].filter(
        Boolean,
      )
    : [];

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <header>
        <h1 className="font-display text-3xl font-bold">{name}</h1>
        {event ? (
          <p className="mt-3 text-sm text-muted">
            {[FORMAT_LABELS[event.format], scheduleLine(event)]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : (
          <p className="mt-3 text-muted">
            The full event details aren&apos;t available in this environment.
            This event is at <code>/{slug}</code>.
          </p>
        )}
      </header>

      {banner && <RegistrationBanner banner={banner} />}

      {event?.summary && <p className="mt-6 text-lg">{event.summary}</p>}
      {event?.description && (
        <div className="mt-4 space-y-4">
          {descriptionParagraphs(event.description).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      )}

      {event && location.length > 0 && (
        <section className="mt-8" aria-labelledby={`location-${slug}`}>
          <h2 id={`location-${slug}`} className="eyebrow">
            LOCATION
          </h2>
          <ul className="mt-3 space-y-1">
            {event.venue_name && <li>{event.venue_name}</li>}
            {event.venue_address && (
              <li className="text-muted">{event.venue_address}</li>
            )}
            {event.attendance_url && (
              <li>
                <a
                  href={event.attendance_url}
                  className="underline underline-offset-4"
                >
                  {event.attendance_url}
                </a>
              </li>
            )}
          </ul>
        </section>
      )}

      {days.length > 0 && (
        <section className="mt-10" aria-labelledby={`program-${slug}`}>
          <h2 id={`program-${slug}`} className="eyebrow">
            PROGRAM
          </h2>
          {days.map((day) => (
            <div key={day.key} className="mt-6">
              <h3 className="font-display text-xl font-bold">{day.label}</h3>
              <ol className="mt-3 space-y-4">
                {day.sessions.map((session) => (
                  <li
                    key={session.key}
                    className="rounded-xl border border-line bg-surface p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>{session.time}</span>
                      {session.track && <Badge>{session.track}</Badge>}
                      {session.room && <span>{session.room}</span>}
                    </div>
                    <h4 className="mt-1 font-semibold">{session.title}</h4>
                    {session.speakerNames.length > 0 && (
                      <p className="mt-1 text-sm text-muted">
                        {session.speakerNames.join(", ")}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </section>
      )}

      {speakers.length > 0 && (
        <section className="mt-10" aria-labelledby={`speakers-${slug}`}>
          <h2 id={`speakers-${slug}`} className="eyebrow">
            SPEAKERS
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {speakers.map((speaker) => (
              <li
                key={speaker.key}
                className="rounded-xl border border-line bg-surface p-4"
              >
                <p className="font-semibold">{speaker.name}</p>
                {[speaker.role, speaker.organization]
                  .filter(Boolean)
                  .join(" · ") && (
                  <p className="text-sm text-muted">
                    {[speaker.role, speaker.organization]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {speaker.bio && (
                  <p className="mt-2 text-sm text-muted">{speaker.bio}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {action !== "none" && (
        <EventAction kind={action} slug={slug} name={name} preview={preview} />
      )}
    </main>
  );
}

// LinkStatePage renders web#10's one shared screen for a link that didn't
// reach an event: unknown, draft and private slugs get the identical screen,
// and an unreachable API gets its own with a retry that re-asks the server.
function LinkStatePage({ outcome }: { outcome: EventApiOutcome }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <EventLinkState outcome={outcome} />
    </main>
  );
}

// RegistrationBanner states the registration availability (web#6). While the
// window is shut this banner is the only thing offering a next step: no join
// button is rendered anywhere on the page.
function RegistrationBanner({ banner }: { banner: LandingBanner }) {
  return (
    <aside
      aria-label="Registration status"
      className={
        banner.tone === "success"
          ? "mt-6 rounded-xl border border-transparent bg-lime p-4 text-lime-ink"
          : "mt-6 rounded-xl border border-dashed border-line p-4"
      }
    >
      <p className="font-bold">{banner.title}</p>
      {banner.body && <p className="mt-1 text-sm">{banner.body}</p>}
      {banner.action && (
        <div className="mt-3">
          <ButtonLink href={banner.action.href}>
            {banner.action.label}
          </ButtonLink>
        </div>
      )}
    </aside>
  );
}

// EventAction is the one decision this page makes for the visitor, chosen by
// landingAction: an attendee already in gets their workspace, an attendee who
// isn't reviews and confirms, an organizer is pointed at an attendee account,
// and anyone signed out signs up or in carrying the event. Nothing here writes
// without an explicit press, and while registration is shut it renders nothing.
function EventAction({
  kind,
  slug,
  name,
  preview,
}: {
  kind: LandingAction;
  slug: string;
  name: string;
  preview: JoinPreviewResult | null;
}) {
  switch (kind) {
    case "workspace":
      return (
        <div className="mt-8">
          <ButtonLink href={routes.eventWorkspace(slug)}>
            Open your event workspace
          </ButtonLink>
        </div>
      );

    case "review":
      if (preview?.kind !== "review") return null;
      return (
        <div className="mt-8 flex flex-col gap-6">
          <JoinReview slug={slug} name={name} preview={preview.preview} />
        </div>
      );

    case "create_profile":
      return (
        <div className="mt-8 flex flex-col items-start gap-3">
          <p className="text-sm text-muted">
            Create your profile before you join {name}. It is the profile
            everyone at the event will see, and you only join when you confirm.
          </p>
          <ButtonLink
            href={withEventParam("/attendee/profile/edit?onboarding=1", slug)}
          >
            Create your profile
          </ButtonLink>
        </div>
      );

    case "join":
      // The API couldn't provide the review. Joining stays possible and is
      // idempotent, and the API is the authority on whether this attendee may
      // join.
      return (
        <div className="mt-8">
          <JoinEvent slug={slug} name={name} />
        </div>
      );

    case "organizer_note":
      return (
        <p className="mt-8 text-sm text-muted">
          Organizer accounts don&apos;t join events.{" "}
          <Link href={withEventParam(routes.attendeeSignIn, slug)}>
            Sign in with an attendee account
          </Link>{" "}
          to join this one.
        </p>
      );

    case "register":
      return (
        <div className="mt-8 flex flex-col items-start gap-3">
          <ButtonLink href={withEventParam(routes.attendeeSignUp, slug)}>
            Join {name}
          </ButtonLink>
          <p className="text-sm text-muted">
            Set up your profile, explore the program, and meet the right people.
          </p>
          <Link href={withEventParam(routes.attendeeSignIn, slug)}>
            I already have an account
          </Link>
        </div>
      );

    case "none":
      return null;
  }
}
