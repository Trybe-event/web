import type { Schemas } from "./api/client";

export type MyEventFilter = "upcoming" | "past" | "all";

export function pastEvent(item: Schemas["MyEvent"], now: number) {
  return item.event.status === "ended" || Date.parse(item.event.ends_at) <= now;
}

export function filterAttendeeEvents(
  items: Schemas["MyEvent"][],
  filter: MyEventFilter,
  search: string,
  now: number,
) {
  const query = search.trim().toLocaleLowerCase();
  return items
    .filter(
      (item) =>
        (filter === "all" ||
          (filter === "past" ? pastEvent(item, now) : !pastEvent(item, now))) &&
        [
          item.event.name,
          item.event.venue_name,
          item.event.organizer_name,
        ].some((value) => value?.toLocaleLowerCase().includes(query)),
    )
    .sort((first, second) =>
      filter === "past"
        ? Date.parse(second.event.starts_at) - Date.parse(first.event.starts_at)
        : Date.parse(first.event.starts_at) -
          Date.parse(second.event.starts_at),
    );
}

export function attendeeEventDestination(item: Schemas["MyEvent"]) {
  const code = encodeURIComponent(item.event.slug);
  return item.membership.status === "active" ? `/events/${code}` : `/${code}`;
}
