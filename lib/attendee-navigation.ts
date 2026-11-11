export type AttendeeSection = "discover" | "events" | "network" | "profile";

export function attendeeSection(pathname: string): AttendeeSection {
  if (pathname.startsWith("/attendee/discover")) return "discover";
  if (
    ["/attendee/connections", "/attendee/requests", "/attendee/inbox"].some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  )
    return "network";
  if (
    pathname.startsWith("/attendee/profile") ||
    pathname.startsWith("/attendee/notifications")
  )
    return "profile";
  return "events";
}

export const attendeeSections = [
  { id: "discover", label: "Discover", href: "/attendee/discover" },
  { id: "events", label: "My events", href: "/attendee" },
  { id: "network", label: "Network", href: "/attendee/connections" },
  { id: "profile", label: "Profile", href: "/attendee/profile" },
] as const;
