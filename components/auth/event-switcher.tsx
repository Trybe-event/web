"use client";

import { useRouter } from "next/navigation";

import { Select } from "@/components/ui";
import type { EventOption } from "@/lib/events";
import { routes } from "@/lib/routes";

// EventSwitcher lets an attendee move between the events they belong to. The
// choice navigates to that event's workspace, so the switcher is the single
// entry point rather than a purely visual control.
export function EventSwitcher({
  events,
  activeSlug,
}: {
  events: EventOption[];
  activeSlug?: string;
}) {
  const router = useRouter();
  const active = events.some((event) => event.slug === activeSlug)
    ? activeSlug
    : "";

  return (
    <div className="workspace-switcher">
      <label htmlFor="event-switcher" className="switcher-label">
        Your events
      </label>
      <Select
        id="event-switcher"
        className="switcher-select"
        value={active}
        onChange={(e) => {
          if (e.target.value)
            router.push(routes.eventWorkspace(e.target.value));
        }}
      >
        <option value="" disabled>
          Choose an event
        </option>
        {events.map((event) => (
          <option key={event.slug} value={event.slug}>
            {event.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
