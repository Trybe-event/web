// "notifications" belongs to no tab: the bell in the header is its way in.
export type AttendeeSection =
  "discover" | "events" | "network" | "profile" | "notifications";

export function attendeeSection(pathname: string): AttendeeSection {
  if (pathname.startsWith("/attendee/discover")) return "discover";
  if (
    ["/attendee/connections", "/attendee/requests", "/attendee/inbox"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  )
    return "network";
  if (pathname.startsWith("/attendee/notifications")) return "notifications";
  if (pathname.startsWith("/attendee/profile")) return "profile";
  return "events";
}

export const attendeeSections = [
  { id: "discover", label: "Discover", href: "/attendee/discover" },
  { id: "events", label: "My events", href: "/attendee" },
  { id: "network", label: "Network", href: "/attendee/connections" },
  { id: "profile", label: "Profile", href: "/attendee/profile" },
] as const;
