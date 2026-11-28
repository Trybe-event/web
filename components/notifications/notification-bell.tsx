"use client";

import { Bell } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { api } from "@/lib/api/client";
import { bellLabel } from "@/lib/notifications/links";

import { NOTIFICATIONS_EVENT } from "./use-notification-stream";

// MSW answers fetch, not EventSource, so mock mode falls back to polling.
const mockMode = process.env.NEXT_PUBLIC_API_MOCKS === "1";

/**
 * The header bell with the unread count. It listens to the notification stream, so a
 * new notification shows at once without polling; each event triggers one refetch of
 * the count, which keeps the number right even if a frame is missed. On the
 * notifications page that page already holds the stream and broadcasts its count, so
 * the bell follows it instead of opening a second connection.
 */
export function NotificationBell() {
  const pathname = usePathname();
  const onCenter = pathname.startsWith("/attendee/notifications");
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const { data } = await api.GET("/notifications", {
          params: { query: { limit: 1 } },
        });
        if (active && data) setUnread(data.unread);
      } catch {
        // Keep the last count; the next event or reconnect corrects it.
      }
    };
    const fromCenter = (event: Event) => {
      const detail = (event as CustomEvent<{ unread: number }>).detail;
      if (detail && typeof detail.unread === "number") setUnread(detail.unread);
    };
    window.addEventListener(NOTIFICATIONS_EVENT, fromCenter);
    void refresh();

    let source: EventSource | undefined;
    let poll: ReturnType<typeof setInterval> | undefined;
    if (mockMode) poll = setInterval(() => void refresh(), 20_000);
    else if (!onCenter) {
      source = new EventSource("/api/notifications/stream");
      source.onmessage = () => void refresh();
      // After a dropped connection, events in between are not replayed here.
      source.onopen = () => void refresh();
    }
    return () => {
      active = false;
      window.removeEventListener(NOTIFICATIONS_EVENT, fromCenter);
      source?.close();
      if (poll) clearInterval(poll);
    };
  }, [onCenter]);

  const label = bellLabel(unread);
  return (
    <Link
      href="/attendee/notifications"
      className="attendee-icon-link relative"
      aria-label={
        label ? `Notifications, ${unread} unread` : "Notifications, none unread"
      }
      aria-current={onCenter ? "page" : undefined}
    >
      <Bell size={18} aria-hidden="true" />
      {label && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-lime px-1 text-[11px] font-bold leading-5 text-lime-ink"
        >
          {label}
        </span>
      )}
    </Link>
  );
}
