"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, MapPin, Search, Compass } from "lucide-react";
import { useState } from "react";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  Field,
  Input,
} from "@/components/ui";
import type { Schemas } from "@/lib/api/client";
import {
  attendeeEventDestination,
  filterAttendeeEvents,
  type MyEventFilter,
} from "@/lib/attendee-event-list";

export function AttendeeMyEvents({
  items,
  now,
}: {
  items: Schemas["MyEvent"][];
  now: number;
}) {
  const [filter, setFilter] = useState<MyEventFilter>("upcoming");
  const [search, setSearch] = useState("");
  const events = filterAttendeeEvents(items, filter, search, now);
  return (
    <section
      className="attendee-events-section"
      aria-label="Your event registrations"
    >
      <div className="attendee-event-toolbar">
        <div
          role="group"
          aria-label="Filter your events"
          className="attendee-filter-tabs"
        >
          {(["upcoming", "past", "all"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {value === "upcoming"
                ? "Upcoming"
                : value === "past"
                  ? "Past"
                  : "All events"}
            </button>
          ))}
        </div>
        <div className="attendee-event-search">
          <Search size={16} aria-hidden="true" />
          <Field label="Search your events">
            {(props) => (
              <Input
                {...props}
                value={search}
                onChange={(change) => setSearch(change.target.value)}
                type="search"
                placeholder="Search your events"
              />
            )}
          </Field>
        </div>
      </div>
      {events.length === 0 ? (
        <div className="attendee-empty-state">
          <Compass size={28} aria-hidden="true" />
          <EmptyState
            title={
              search
                ? "No events match your search"
                : filter === "past"
                  ? "Your story is still unfolding"
                  : "Your next gathering is ahead"
            }
            action={
              <ButtonLink href="/attendee/discover" variant="secondary">
                Discover events
              </ButtonLink>
            }
          >
            <p>
              {search
                ? "Try another event name, host or location."
                : filter === "past"
                  ? "Events you’ve been part of will appear here after their scheduled end."
                  : "Have an invitation? Open your organizer’s event link to review your profile and join."}
            </p>
          </EmptyState>
        </div>
      ) : (
        <div className="attendee-event-grid">
          {events.map((item) => (
            <AttendeeEventCard key={item.event.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function AttendeeEventCard({ item }: { item: Schemas["MyEvent"] }) {
  const { event, membership } = item;
  const label =
    membership.status === "pending"
      ? "Awaiting approval"
      : membership.status === "waitlisted"
        ? "On the waitlist"
        : event.status === "ended"
          ? "Past event"
          : "Registered";
  const date = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: event.timezone,
  }).format(new Date(event.starts_at));
  return (
    <Card className="attendee-event-card">
      <Link
        href={attendeeEventDestination(item)}
        className="attendee-event-card-link"
      >
        <div className="attendee-event-cover">
          {event.image_url ? (
            <Image
              src={event.image_url}
              alt={`${event.name} cover`}
              width={640}
              height={360}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="attendee-event-cover-placeholder">
              <CalendarDays size={32} aria-hidden="true" />
              <span>{event.name}</span>
            </div>
          )}
          <span className="attendee-event-cover-badge">
            <Badge>{label}</Badge>
          </span>
        </div>
        <div className="attendee-event-card-body">
          <p className="attendee-event-host">
            {event.organizer_name || "Your event community"}
          </p>
          <h2>{event.name}</h2>
          <p>
            <CalendarDays size={14} aria-hidden="true" />
            <span>
              {date} <small>({event.timezone})</small>
            </span>
          </p>
          <p>
            <MapPin size={14} aria-hidden="true" />
            <span>
              {event.venue_name ||
                (event.format === "virtual"
                  ? "Online event"
                  : "Venue to be announced")}
            </span>
          </p>
          <span className="attendee-event-open">
            {membership.status === "active"
              ? "Open event"
              : "View registration"}
          </span>
        </div>
      </Link>
    </Card>
  );
}
