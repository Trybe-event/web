import type { components } from "@/lib/api/schema";

type Notification = components["schemas"]["Notification"];

// Where a notification takes the attendee. Event notifications need the event's code,
// which the caller looks up from the attendee's own events; without it they open the
// events list instead of guessing a link.
export function notificationHref(
  n: Pick<Notification, "kind" | "event_id" | "subject_id">,
  slugByEventId: Map<string, string>,
): string {
  switch (n.kind) {
    case "organizer_update":
    case "question_answered": {
      const slug = n.event_id ? slugByEventId.get(n.event_id) : undefined;
      return slug ? `/events/${encodeURIComponent(slug)}/updates` : "/attendee";
    }
    case "message":
      return n.subject_id
        ? `/attendee/inbox/${encodeURIComponent(n.subject_id)}`
        : "/attendee/inbox";
    case "connection_accepted":
      return "/attendee/connections";
    case "connection_request":
      return "/attendee/requests";
  }
  return "/attendee/notifications";
}

// The number shown on the bell: nothing for none, "9+" past nine.
export function bellLabel(unread: number): string | null {
  if (unread <= 0) return null;
  return unread > 9 ? "9+" : String(unread);
}
