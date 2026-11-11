import Link from "next/link";
import { CalendarDays, ImageIcon, ListChecks, Share2 } from "lucide-react";
import { Card, ButtonLink, Alert } from "@/components/ui";
import { EventStatusBadges } from "./event-status-badges";
import { RegistrationTrend } from "./registration-trend";
import { RetryDashboard } from "./retry-dashboard";
import type { Schemas } from "@/lib/api/client";
import type {
  OrganizerEvent,
  RegistrationPoint,
} from "@/lib/organizer-dashboard";
import { publicationErrors } from "@/lib/event-publication";
import { eventDraftValues } from "@/lib/event-form";

export function EventOverview({
  event,
  summary,
  program,
  trend,
}: {
  event: Schemas["Event"];
  summary: OrganizerEvent | null;
  program: Schemas["Program"] | null;
  trend: RegistrationPoint[] | null;
}) {
  const root = `/organizer/events/${encodeURIComponent(event.id)}`;
  const sessions = program?.days.flatMap((day) => day.sessions);
  const incomplete = Object.keys(
    publicationErrors(eventDraftValues(event)),
  ).length;
  return (
    <>
      <header className="organizer-event-heading">
        <div>
          <EventStatusBadges event={event} />
          <h1>{event.name || "Untitled event"}</h1>
          <p>
            {event.status === "draft"
              ? "Bring your event together, then review and publish."
              : "Your event, your community, all in one place."}
          </p>
        </div>
        <ButtonLink
          href={event.status === "draft" ? `${root}/edit` : `${root}/preview`}
          variant="secondary"
        >
          {event.status === "draft" ? "Continue setup" : "View event page"}
        </ButtonLink>
      </header>
      <section className="organizer-event-metrics" aria-label="Event summary">
        <Card>
          <span>Registrations</span>
          <strong>
            {summary
              ? summary.registrations.toLocaleString("en")
              : "Unavailable"}
          </strong>
          <p>Confirmed event sign-ups</p>
        </Card>
        <Card>
          <span>Program days</span>
          <strong>{program ? program.days.length : "Unavailable"}</strong>
          <p>Across your event schedule</p>
        </Card>
        <Card>
          <span>Sessions</span>
          <strong>{sessions ? sessions.length : "Unavailable"}</strong>
          <p>Talks, workshops and activities</p>
        </Card>
        <Card>
          <span>Speaker appearances</span>
          <strong>
            {sessions
              ? sessions.reduce(
                  (total, session) => total + (session.speakers?.length || 0),
                  0,
                )
              : "Unavailable"}
          </strong>
          <p>Across all saved sessions</p>
        </Card>
      </section>
      {(!summary || !program) && (
        <Alert>
          Some event data could not be loaded. Your saved details have not
          changed. <RetryDashboard />
        </Alert>
      )}
      <Card className="organizer-event-checklist">
        <h2>
          {event.status === "draft"
            ? "Get ready to publish"
            : "Make the most of your event"}
        </h2>
        <Link href={`${root}/edit`}>
          <ListChecks size={18} aria-hidden="true" />
          <span>
            <strong>Event details</strong>
            <small>
              {incomplete
                ? `${incomplete} required fields need attention`
                : "Required details complete"}
            </small>
          </span>
          <span>Open setup</span>
        </Link>
        <Link href={`${root}/edit?step=experience`}>
          <CalendarDays size={18} aria-hidden="true" />
          <span>
            <strong>Agenda &amp; lineup</strong>
            <small>Add days, sessions, times and speakers</small>
          </span>
          <span>Edit program</span>
        </Link>
        <Link href={`${root}/edit?step=page`}>
          <ImageIcon size={18} aria-hidden="true" />
          <span>
            <strong>Event page</strong>
            <small>Review your cover and invitation</small>
          </span>
          <span>Preview</span>
        </Link>
        <Link href={`${root}/share`}>
          <Share2 size={18} aria-hidden="true" />
          <span>
            <strong>Bring your people</strong>
            <small>
              {event.status === "draft"
                ? "Your link and QR become available after publication"
                : "Share your event link and QR code"}
            </small>
          </span>
          <span>Reach</span>
        </Link>
      </Card>
      <div className="organizer-event-two-column">
        <Card className="space-y-4">
          <h2>Registration trend</h2>
          {trend ? (
            <RegistrationTrend points={trend} />
          ) : (
            <>
              <p className="text-sm text-muted">
                Registration history is temporarily unavailable.
              </p>
              <RetryDashboard />
            </>
          )}
        </Card>
        <Card className="space-y-4">
          <h2>Event readiness</h2>
          <p className="text-sm text-muted">
            {incomplete
              ? "Finish your required event details before publishing."
              : "Your required event details are complete."}
          </p>
          <p className="text-sm text-muted">
            Registration totals count sign-ups. Physical attendance requires
            check-in, which is being built.
          </p>
          <ButtonLink variant="secondary" href={`${root}/edit`}>
            Manage event setup
          </ButtonLink>
        </Card>
      </div>
    </>
  );
}
