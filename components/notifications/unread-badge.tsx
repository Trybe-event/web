"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api/client";

import { NOTIFICATIONS_EVENT } from "./use-notification-stream";

/**
 * Unread badge for the workspace nav. web#11 mounts this once in the shell
 * header (e.g. `<NotificationsBadge />` next to the theme toggle): it links
 * to the notification center, polls slowly, and stays in step with an open
 * notification center via the shared `trybe:notifications` event, so no
 * second SSE connection is ever opened.
 */
export function NotificationsBadge() {
  const [unread, setUnread] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const { data } = await api.GET("/notifications", {
        params: { query: { limit: 1 } },
      });
      if (active && data) setUnread(data.unread);
    };
    void refresh();
    const poll = setInterval(() => void refresh(), 60_000);
    const live = (event: Event) => {
      const detail = (event as CustomEvent<{ unread: number }>).detail;
      if (detail && typeof detail.unread === "number") setUnread(detail.unread);
    };
    window.addEventListener(NOTIFICATIONS_EVENT, live);
    return () => {
      active = false;
      clearInterval(poll);
      window.removeEventListener(NOTIFICATIONS_EVENT, live);
    };
  }, []);

  if (unread === null || unread === 0)
    return (
      <Link
        href="/attendee/notifications"
        className="text-sm font-semibold text-ink underline-offset-4 hover:underline"
      >
        Notifications
      </Link>
    );

  return (
    <Link
      href="/attendee/notifications"
      className="text-sm font-semibold text-ink underline-offset-4 hover:underline"
    >
      Notifications
      <span
        aria-label={`${unread} unread notifications`}
        className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-lime px-1.5 py-0.5 text-xs font-bold text-lime-ink"
      >
        {unread > 99 ? "99+" : unread}
      </span>
    </Link>
  );
}
