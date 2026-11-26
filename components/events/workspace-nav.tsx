"use client";
import {
  Archive,
  BookmarkCheck,
  CalendarDays,
  LayoutGrid,
  Link2,
  Megaphone,
  MessageSquare,
  QrCode,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function EventWorkspaceNavigation({
  slug,
  networkingClosed = false,
  entryPass = false,
}: {
  slug: string;
  networkingClosed?: boolean;
  entryPass?: boolean;
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
    { title: "My agenda", href: `${base}/agenda`, icon: BookmarkCheck },
    { title: "Updates & Q&A", href: `${base}/updates`, icon: Megaphone },
    ...(entryPass
      ? [{ title: "Entry pass", href: `${base}/pass`, icon: QrCode }]
      : []),
    // The attendee's network at this event, and their profile, stay in this frame.
    { title: "Connections", href: `${base}/connections`, icon: Link2 },
    { title: "Messages", href: `${base}/messages`, icon: MessageSquare },
    { title: "Edit my profile", href: `${base}/profile`, icon: UserRound },
    // Everything not about this event lives in the general workspace.
    { title: "All my events", href: "/attendee", icon: LayoutGrid },
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
          aria-current={
            pathname === link.href ||
            // A conversation or attendee page belongs to the section it sits under.
            (link.href.startsWith(`${base}/`) &&
              pathname.startsWith(`${link.href}/`))
              ? "page"
              : undefined
          }
          className="attendee-event-nav-link"
        >
          <link.icon size={17} aria-hidden="true" className="shrink-0" />
          <span>{link.title}</span>
        </Link>
      ))}
    </nav>
  );
}
