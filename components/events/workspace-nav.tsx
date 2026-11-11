"use client";
import {
  Archive,
  Bell,
  CalendarDays,
  Link2,
  Megaphone,
  MessageSquare,
  Settings,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function EventWorkspaceNavigation({
  slug,
  networkingClosed = false,
}: {
  slug: string;
  networkingClosed?: boolean;
}) {
  const pathname = usePathname();
  const base = `/events/${encodeURIComponent(slug)}`;
  const links = [
    ...(networkingClosed
      ? [{ title: "Event archive", href: `${base}/archive`, icon: Archive }]
      : [
          { title: "Matches", href: base, icon: Sparkles },
          {
            title: "All attendees",
            href: `${base}/attendees`,
            icon: UsersRound,
          },
        ]),
    { title: "Program", href: `${base}/program`, icon: CalendarDays },
    { title: "Updates & Q&A", href: `${base}/updates`, icon: Megaphone },
    { title: "Notifications", href: "/attendee/notifications", icon: Bell },
    { title: "Profile", href: "/attendee/profile", icon: UserRound },
    { title: "Settings", href: "/attendee/profile/settings", icon: Settings },
    { title: "Connections", href: "/attendee/connections", icon: Link2 },
    { title: "Inbox", href: "/attendee/inbox", icon: MessageSquare },
  ];
  return (
    <nav
      aria-label="Event workspace"
      className="attendee-event-navigation sticky top-0"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className="attendee-event-nav-link"
        >
          <link.icon size={17} aria-hidden="true" className="shrink-0" />
          <span>{link.title}</span>
        </Link>
      ))}
    </nav>
  );
}
