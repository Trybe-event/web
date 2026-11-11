import { CalendarDays } from "lucide-react";
import Link from "next/link";

import { Card, Skeleton } from "@/components/ui";
import { EventStatusBadges } from "./event-status-badges";
import {
  loadOrganizerEvents,
  type OrganizerEvent,
} from "@/lib/organizer-dashboard";
import { RetryDashboard } from "./retry-dashboard";
import { EventThumbnail } from "./event-thumbnail";
import { DeleteDraft } from "./delete-draft";
import { OrganizerEventList } from "./event-list";

export function DashboardLoading() {
  return (
    <div role="status" className="mt-6 space-y-4">
      <span className="sr-only">Loading your events...</span>
      <Skeleton className="h-10" />
      <Skeleton className="h-32" />
    </div>
  );
}

function EventRow({ event }: { event: OrganizerEvent }) {
  const destination =
    event.status === "draft"
      ? `/organizer/events/${encodeURIComponent(event.id)}/edit`
      : `/organizer/events/${encodeURIComponent(event.id)}`;
  return (
    <Card className="grid min-w-0 grid-cols-[5rem_minmax(0,1fr)] items-start gap-4 md:grid-cols-[6rem_minmax(0,1fr)]">
      <EventThumbnail imageUrl={event.image_url} name={event.name} />
      <div className="min-w-0">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <EventStatusBadges event={event} />
        </div>
        <h3 className="break-words text-sm font-semibold">
          <Link href={destination} className="hover:underline">
            {event.name || "Untitled event"}
          </Link>
        </h3>
        <p className="mt-2 flex items-center gap-2 text-xs text-muted">
          <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
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
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {event.registrations.toLocaleString("en")}{" "}
            {event.registrations === 1 ? "registration" : "registrations"}
          </p>
          {event.status === "draft" && (
            <DeleteDraft eventId={event.id} name={event.name} />
          )}
        </div>
      </div>
    </Card>
  );
}

export async function OrganizerDashboard() {
  const events = await loadOrganizerEvents();
  if (events === null)
    return (
      <Card className="mt-6 flex flex-col items-start gap-3">
        <div role="alert">
          <h2 className="text-sm font-semibold">
            Your events could not be loaded.
          </h2>
          <p className="mt-2 text-xs text-muted">
            Try again in a moment. We haven&apos;t changed any of your events.
          </p>
        </div>
        <RetryDashboard />
      </Card>
    );
  return (
    <section aria-label="Your events">
      <OrganizerEventList
        items={events.map((event) => ({
          id: event.id,
          name: event.name,
          status: event.status,
          content: <EventRow event={event} />,
        }))}
      />
    </section>
  );
}
