"use client";
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
      ? [{ title: "Event archive", href: `${base}/archive` }]
      : [
          { title: "Matches", href: base },
          { title: "All attendees", href: `${base}/attendees` },
        ]),
    { title: "Program", href: `${base}/program` },
    { title: "Notifications", href: "/attendee/notifications" },
    { title: "Profile", href: "/attendee/profile" },
    { title: "Settings", href: "/attendee/profile/settings" },
  ];
  return (
    <nav
      aria-label="Event workspace"
      className="fixed inset-x-0 bottom-0 z-20 flex max-h-[38vh] flex-wrap gap-1 overflow-y-auto border-t border-line bg-paper p-2 shadow-lg md:sticky md:top-4 md:max-h-none md:w-48 md:shrink-0 md:flex-col md:self-start md:border md:shadow-none md:rounded-xl"
    >
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className={`min-h-11 rounded-lg px-3 py-3 text-sm font-semibold ${pathname === link.href ? "bg-ink text-paper" : "text-ink hover:bg-line"}`}
        >
          {link.title}
        </Link>
      ))}
      {["Connections", "Inbox"].map((title) => (
        <button
          key={title}
          type="button"
          disabled
          className="min-h-11 px-3 py-3 text-left text-sm text-muted"
        >
          {title} (not available yet)
        </button>
      ))}
    </nav>
  );
}
