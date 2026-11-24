import { CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge, Button, Card, Select } from "@/components/ui";
import type { Schemas } from "@/lib/api/client";
import { serverApi } from "@/lib/api/server";
import { eventCategories } from "@/lib/event-form";
import { routes } from "@/lib/routes";

// Discover filters live in the page address, so a filtered view can be shared and
// works without JavaScript.
export type DiscoverFilters = {
  category?: string;
  format?: DiscoverEvent["format"];
  status?: "active" | DiscoverEvent["state"];
  price?: DiscoverEvent["pricing"];
  openOnly?: boolean;
};

const STATUS_OPTIONS = [
  ["active", "Active (upcoming and happening now)"],
  ["upcoming", "Upcoming"],
  ["ongoing", "Happening now"],
  ["ended", "Ended"],
] as const;

export function discoverFilters(
  params: Record<string, string | string[] | undefined>,
): DiscoverFilters {
  const one = (name: string) =>
    typeof params[name] === "string" ? (params[name] as string) : undefined;
  const category = one("category");
  const format = one("format");
  const status = one("status");
  const price = one("price");
  return {
    category: eventCategories.some((c) => c === category)
      ? category
      : undefined,
    format:
      format === "physical" || format === "virtual" || format === "hybrid"
        ? format
        : undefined,
    status: STATUS_OPTIONS.some(([value]) => value === status)
      ? (status as DiscoverFilters["status"])
      : undefined,
    price: price === "free" || price === "paid" ? price : undefined,
    openOnly: one("open") === "1",
  };
}

export function matchesFilters(event: DiscoverEvent, filters: DiscoverFilters) {
  return (
    (!filters.category || event.category === filters.category) &&
    (!filters.format || event.format === filters.format) &&
    (!filters.status ||
      (filters.status === "active"
        ? event.state !== "ended"
        : event.state === filters.status)) &&
    (!filters.price || event.pricing === filters.price) &&
    (!filters.openOnly || event.registration_state === "open")
  );
}

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
  filters = {},
}: {
  joinedSlugs: Set<string>;
  filters?: DiscoverFilters;
}) {
  const all = await loadDiscoverEvents();
  const events = all?.filter((event) => matchesFilters(event, filters)) ?? null;
  const filtered = Boolean(
    filters.category ||
    filters.format ||
    filters.status ||
    filters.price ||
    filters.openOnly,
  );
  return (
    <section aria-labelledby="discover-title" className="flex flex-col gap-4">
      <div>
        <h2 id="discover-title" className="text-xl font-bold">
          Public events
        </h2>
        <p className="text-sm text-muted">
          Upcoming and live events first, then past events. Open one to see its
          program and join. Private events are only reachable through their
          invitation link.
        </p>
      </div>
      <form
        method="get"
        className="flex flex-wrap items-end gap-3"
        aria-label="Filter events"
      >
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Status
          <Select name="status" defaultValue={filters.status ?? ""}>
            <option value="">All events</option>
            {STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Price
          <Select name="price" defaultValue={filters.price ?? ""}>
            <option value="">Free and paid</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Category
          <Select name="category" defaultValue={filters.category ?? ""}>
            <option value="">All categories</option>
            {eventCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </Select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          Format
          <Select name="format" defaultValue={filters.format ?? ""}>
            <option value="">Any format</option>
            <option value="physical">In person</option>
            <option value="virtual">Online</option>
            <option value="hybrid">In person and online</option>
          </Select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="open"
            value="1"
            defaultChecked={filters.openOnly}
          />
          Open for registration
        </label>
        <Button type="submit" variant="secondary">
          Show events
        </Button>
        {filtered && (
          <Link href="?" className="text-sm font-semibold underline">
            Clear filters
          </Link>
        )}
      </form>
      {events === null ? (
        <p role="status" className="text-sm text-muted">
          Upcoming events couldn&apos;t be loaded right now. Refresh to try
          again.
        </p>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted">
          {filtered
            ? "No public events match these filters. Try another category or clear the filters."
            : "No public events are open yet. When an organizer publishes one, it appears here."}
        </p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {events.map((event) => {
            const joined = joinedSlugs.has(event.slug);
            return (
              <li key={event.id}>
                <Card className="flex h-full flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {event.state === "ended" ? (
                      <Badge>Ended</Badge>
                    ) : event.state === "ongoing" ? (
                      <Badge tone="success">Happening now</Badge>
                    ) : null}
                    {joined ? (
                      <Badge tone="success">Joined</Badge>
                    ) : event.state ===
                      "ended" ? null : event.registration_state === "open" ? (
                      <Badge tone="success">Registration open</Badge>
                    ) : (
                      <Badge>
                        {event.registration_state === "not_open"
                          ? "Registration opens soon"
                          : "Registration closed"}
                      </Badge>
                    )}
                    <Badge>{FORMAT_LABEL[event.format]}</Badge>
                    <Badge>{event.pricing === "paid" ? "Paid" : "Free"}</Badge>
                    {event.category && <Badge>{event.category}</Badge>}
                    {event.approval_required &&
                      !joined &&
                      event.state !== "ended" && (
                        <Badge>Approval required</Badge>
                      )}
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
