"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api } from "@/lib/api/client";
import { badgeCount, unreadMessages } from "@/lib/messaging/inbox";

import { INBOX_UPDATED_EVENT } from "./use-inbox-live";

/**
 * Inbox link with the message unread count from GET /me/unread. It lives in
 * the attendee nav; the inbox page owns the notification stream and fires
 * `trybe:inbox` after each refresh, so this badge never opens a second one.
 * The slow poll keeps it honest on pages that don't stream.
 */
export function InboxBadge() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const { data } = await api.GET("/me/unread");
      if (active && data) setUnread(unreadMessages(data));
    };
    void refresh();
    const poll = setInterval(() => void refresh(), 60_000);
    window.addEventListener(INBOX_UPDATED_EVENT, refresh);
    return () => {
      active = false;
      clearInterval(poll);
      window.removeEventListener(INBOX_UPDATED_EVENT, refresh);
    };
  }, []);

  const count = badgeCount(unread);
  return (
    <Link
      href="/attendee/inbox"
      className="text-sm font-medium text-muted hover:text-ink"
    >
      Inbox
      {count && (
        <span
          aria-label={`${unread} unread messages`}
          className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-lime px-1.5 py-0.5 text-xs font-bold text-lime-ink"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
