"use client";
import {
  Bell,
  CalendarDays,
  Link2,
  MessageSquare,
  Settings,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function EventWorkspaceNavigation({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/events/${encodeURIComponent(slug)}`;
  const links = [
    { title: "Matches", href: base, icon: Sparkles },
    { title: "All attendees", href: `${base}/attendees`, icon: UsersRound },
    { title: "Program", href: `${base}/program`, icon: CalendarDays },
    { title: "Notifications", href: "/attendee/notifications", icon: Bell },
    { title: "Profile", href: "/attendee/profile", icon: UserRound },
    { title: "Settings", href: "/attendee/profile/settings", icon: Settings },
    { title: "Connections", href: "/attendee/connections", icon: Link2 },
  ];
  return (
    <nav
      aria-label="Event workspace"
      className="sticky top-0 z-20 grid w-full grid-cols-4 gap-1 rounded-2xl border border-line bg-paper p-1.5 shadow-sm md:top-4 md:flex md:w-48 md:shrink-0 md:flex-col md:self-start md:rounded-xl md:shadow-none"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] font-semibold leading-tight focus-visible:outline-2 focus-visible:outline-offset-2 md:min-h-11 md:flex-row md:justify-start md:gap-2 md:px-3 md:py-3 md:text-left md:text-sm ${pathname === link.href ? "bg-ink text-paper" : "text-ink hover:bg-line"}`}
        >
          <link.icon size={17} aria-hidden="true" className="shrink-0" />
          <span>{link.title}</span>
        </Link>
      ))}
      {[{ title: "Inbox", icon: MessageSquare }].map(
        ({ title, icon: Icon }) => (
          <button
            key={title}
            type="button"
            disabled
            title={`${title} is not available yet`}
            aria-label={`${title}, not available yet`}
            className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-[11px] leading-tight text-muted md:min-h-11 md:flex-row md:justify-start md:gap-2 md:px-3 md:py-3 md:text-left md:text-sm"
          >
            <Icon size={17} aria-hidden="true" className="shrink-0" />
            <span>
              {title}
              <span className="block text-[10px]">Not available yet</span>
            </span>
          </button>
        ),
      )}
    </nav>
  );
}
