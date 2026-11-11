"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NetworkNavigation() {
  const pathname = usePathname();
  return (
    <nav className="attendee-network-tabs" aria-label="Network sections">
      {[
        { label: "Connections", href: "/attendee/connections" },
        { label: "Messages", href: "/attendee/inbox" },
        { label: "Requests", href: "/attendee/requests" },
      ].map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={
            pathname === item.href || pathname.startsWith(`${item.href}/`)
              ? "page"
              : undefined
          }
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
