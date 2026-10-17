import { ArrowUpRight, CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { ButtonLink, Card, EmptyState, Skeleton } from "@/components/ui";
import { EventStatusBadges } from "./event-status-badges";
import {
  loadOrganizerEvents,
  loadRegistrationTrend,
  type OrganizerEvent,
} from "@/lib/organizer-dashboard";

import { RegistrationTrend } from "./registration-trend";
import { RetryDashboard } from "./retry-dashboard";

export function DashboardLoading() {
  return (
    <div role="status" className="mt-8 space-y-4">
      <span className="sr-only">Loading your events...</span>
      <Skeleton className="h-24" />
      <Skeleton className="h-52" />
      <Skeleton className="h-52" />
    </div>
  );
}

async function EventRegistrationTrend({ eventId }: { eventId: string }) {
  const points = await loadRegistrationTrend(eventId);
  return points === null ? (
    <p className="text-sm text-muted">
      Registration trend is unavailable. Your event totals are still shown.
    </p>
  ) : (
    <RegistrationTrend points={points} />
  );
}

function EventRow({ event }: { event: OrganizerEvent }) {
  const destination =
    event.status === "draft"
      ? `/organizer/events/${encodeURIComponent(event.id)}/edit`
      : `/organizer/events/${encodeURIComponent(event.id)}/share`;
  return (
    <Card className="grid min-w-0 gap-6 md:grid-cols-[minmax(0,1fr)_14rem]">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <EventStatusBadges event={event} />
        </div>
        <h3 className="break-words text-xl font-bold">
          <Link
            href={destination}
            className="inline-flex max-w-full items-start gap-2 rounded-sm hover:underline"
          >
            {event.name || "Untitled event"}
            <ArrowUpRight className="mt-1 size-4 shrink-0" aria-hidden="true" />
          </Link>
        </h3>
        <p className="mt-2 flex items-center gap-2 text-sm text-muted">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          {event.starts_at ? (
            <time dateTime={event.starts_at}>
              {new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeZone: "UTC",
              }).format(new Date(event.starts_at))}{" "}
              (UTC)
            </time>
          ) : (
            "Date not set"
          )}
        </p>
        <p className="mt-4 text-sm">
          <strong className="text-2xl font-bold tabular-nums">
            {event.registrations.toLocaleString("en")}
          </strong>{" "}
          {event.registrations === 1 ? "registration" : "registrations"}
        </p>
      </div>
      <div className="min-w-0 border-t border-line pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-6">
        <h4 className="mb-2 text-sm font-semibold">Registration trend</h4>
        <Suspense
          fallback={
            <div role="status">
              <span className="sr-only">Loading registration trend...</span>
              <Skeleton className="h-20" />
            </div>
          }
        >
          <EventRegistrationTrend eventId={event.id} />
        </Suspense>
      </div>
    </Card>
  );
}

export async function OrganizerDashboard() {
  const events = await loadOrganizerEvents();
  if (events === null)
    return (
      <Card className="mt-8 flex flex-col items-start gap-3">
        <div role="alert">
          <h2 className="text-lg font-bold">
            Your events could not be loaded.
          </h2>
          <p className="mt-2 text-sm text-muted">
            Try again in a moment. We haven&apos;t changed any of your events.
          </p>
        </div>
        <RetryDashboard />
      </Card>
    );
  return (
    <section className="mt-8 space-y-6" aria-labelledby="my-events-heading">
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <dl>
            <dt className="text-sm text-muted">Your events</dt>
            <dd className="mt-2 text-3xl font-bold tabular-nums">
              {events.length.toLocaleString("en")}
            </dd>
          </dl>
        </Card>
        <Card>
          <dl>
            <dt className="text-sm text-muted">Total registrations</dt>
            <dd className="mt-2 text-3xl font-bold tabular-nums">
              {events
                .reduce((total, event) => total + event.registrations, 0)
                .toLocaleString("en")}
            </dd>
          </dl>
        </Card>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="my-events-heading" className="text-xl font-bold">
            My events
          </h2>
          <p className="mt-1 text-sm text-muted">
            Registration totals count sign-ups, not verified attendance.
          </p>
        </div>
      </div>
      {events.length ? (
        <div className="space-y-4">
          {events.map((event) => (
            <EventRow key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Your next community starts here."
          action={
            <ButtonLink href="/organizer/events/new">
              <Plus className="size-4" aria-hidden="true" />
              Create your first event
            </ButtonLink>
          }
        >
          Create an event, share the invitation and bring your people together.
        </EmptyState>
      )}
    </section>
  );
}
