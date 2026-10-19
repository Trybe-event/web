"use client";

import { useEffect, useState } from "react";

import { refreshesInbox } from "@/lib/messaging/inbox";

// Fired on the window after a refresh, so the nav badge (a separate component)
// can update without opening its own stream.
export const INBOX_UPDATED_EVENT = "trybe:inbox";

// MSW answers fetch, not EventSource, so mock mode falls back to polling.
const mockMode = process.env.NEXT_PUBLIC_API_MOCKS === "1";

/**
 * Live inbox updates (web#18). The contract's notification stream carries a
 * `message` notification for every new message; when one arrives the caller
 * refetches `/me/unread` and `/conversations` rather than guessing the new
 * count. Any other notification kind leaves the inbox alone.
 *
 * `revision` changes whenever the caller should refetch. It also changes when
 * the stream reopens after a gap, because the events dropped while the tab
 * couldn't hold a connection are not replayed to this page.
 */
export function useInboxLive(): number {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (mockMode) {
      const poll = setInterval(() => setRevision((value) => value + 1), 20_000);
      return () => clearInterval(poll);
    }

    let missed = false;
    const source = new EventSource("/api/notifications/stream");
    source.onopen = () => {
      if (missed) {
        missed = false;
        setRevision((value) => value + 1);
      }
    };
    source.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data) as {
          kind: Parameters<typeof refreshesInbox>[0]["kind"];
          read: boolean;
        };
        if (refreshesInbox(notification)) setRevision((value) => value + 1);
      } catch {
        // A frame we can't read is not evidence of a new message; the next
        // refresh or reconnect corrects the counts.
      }
    };
    source.onerror = () => {
      // EventSource reconnects with Last-Event-ID on its own.
      if (source.readyState !== EventSource.OPEN) missed = true;
    };
    return () => source.close();
  }, []);

  return revision;
}
