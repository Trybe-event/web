import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge, Card } from "@/components/ui";
import type { Schemas } from "@/lib/api/client";
import { serverApi } from "@/lib/api/server";
import { routes } from "@/lib/routes";

type DiscoverEvent = Schemas["DiscoverEvent"];

const FORMAT_LABEL: Record<DiscoverEvent["format"], string> = {
  physical: "In person",
  virtual: "Online",
  hybrid: "In person and online",
};

function eventDates(event: DiscoverEvent) {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: event.timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  };
  const start = new Intl.DateTimeFormat("en-GB", options).format(
    new Date(event.starts_at),
  );
  return `${start} (${event.timezone})`;
}

async function loadDiscoverEvents(): Promise<DiscoverEvent[] | null> {
  try {
    const { data, response } = await (
      await serverApi()
    ).GET("/discover/events", { signal: AbortSignal.timeout(8000) });
    return response.ok && data ? data.items : null;
  } catch {
    return null;
  }
}

// Public events that haven't ended, so an attendee who is already on Trybe can
// find one without its link. Joining still happens on the event's own page, after
// reviewing what the event will see.
export async function DiscoverEvents({
  joinedSlugs,
}: {
  joinedSlugs: Set<string>;
}) {
  const events = await loadDiscoverEvents();
  return (
    <section aria-labelledby="discover-title" className="flex flex-col gap-4">
      <div>
        <h2 id="discover-title" className="text-xl font-bold">
          Upcoming and ongoing events
        </h2>
        <p className="text-sm text-muted">
          Public events on Trybe. Open one to see its program and join. Private
          events are only reachable through their invitation link.
        </p>
      </div>
      {events === null ? (
        <p role="status" className="text-sm text-muted">
          Upcoming events couldn&apos;t be loaded right now. Refresh to try
          again.
        </p>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted">
          No public events are open yet. When an organizer publishes one, it
          appears here.
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {events.map((event) => {
            const joined = joinedSlugs.has(event.slug);
            return (
              <li key={event.id}>
                <Card className="flex h-full flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {joined ? (
                      <Badge tone="success">Joined</Badge>
                    ) : event.registration_state === "open" ? (
                      <Badge tone="success">Registration open</Badge>
                    ) : (
                      <Badge>
                        {event.registration_state === "not_open"
                          ? "Registration opens soon"
                          : "Registration closed"}
                      </Badge>
                    )}
                    <Badge>{FORMAT_LABEL[event.format]}</Badge>
                  </div>
                  <h3 className="text-lg font-semibold">
                    <Link
                      href={
                        joined
                          ? routes.eventWorkspace(event.slug)
                          : routes.eventLanding(event.slug)
                      }
                      className="hover:underline"
                    >
                      {event.name}
                    </Link>
                  </h3>
                  <p className="text-sm text-muted">
                    Hosted by {event.organizer_name}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm">
                    <CalendarDays size={14} aria-hidden="true" />
                    {eventDates(event)}
                  </p>
                  {event.venue_name && (
                    <p className="flex items-center gap-1.5 text-sm">
                      <MapPin size={14} aria-hidden="true" />
                      {event.venue_name}
                    </p>
                  )}
                  {event.summary && (
                    <p className="text-sm text-muted">{event.summary}</p>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
