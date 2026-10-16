"use client";

import { useCallback, useEffect, useState } from "react";

import { api, errorMessage } from "@/lib/api/client";
import {
  adjustUnreadAfterMarkedRead,
  applyLiveNotification,
  backfillItems,
  replaceUnread,
  type Notification,
} from "@/lib/notifications/stream-merge";

type Held = { items: Notification[]; unread: number };
const emptyHeld: Held = { items: [], unread: 0 };

/**
 * Live attendee notifications (web#16).
 *
 * The stream is the contract's `GET /notifications/stream` (text/event-stream)
 * through the same-origin `/api` proxy. EventSource handles the transport
 * rules natively: it reconnects on its own and resends `Last-Event-ID` so the
 * server can resume from the last delivered id. What the browser can't do is
 * catch up events dropped while the tab couldn't hold a connection — so when
 * the stream reopens after any gap, we also fetch one list page and backfill
 * it through the pure merge rules (each id exactly once, server truth wins).
 */
export function useNotificationStream() {
  const [held, setHeld] = useState<Held>(emptyHeld);
  const [connected, setConnected] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  // Starts true: the effect body must not call setState synchronously.
  const [loading, setLoading] = useState(true);

  // One authoritative refresh from the list endpoint: on mount, and whenever
  // the stream reopens after having dropped.
  const load = useCallback(async () => {
    const { data, error } = await api.GET("/notifications", {
      params: { query: { limit: 50 } },
    });
    if (data) {
      setHeld((prev) => ({
        items: backfillItems(prev.items, data.items),
        unread: replaceUnread(prev.unread, data.unread),
      }));
      setFailure(null);
      return;
    }
    setFailure(errorMessage(error, "Notifications are unavailable right now."));
  }, []);

  // Apply one live event atomically so a retried delivery can't drift the
  // unread count: the item joins or updates the list, and unread moves by
  // exactly the read-flag change between the held copy and the live copy.
  const apply = useCallback((notification: Notification) => {
    setHeld((prev) => {
      const wasHeldCopy = prev.items.find((p) => p.id === notification.id);
      const wasUnread = Boolean(wasHeldCopy && !wasHeldCopy.read);
      const nowUnread = !notification.read;
      const unread =
        wasUnread && !nowUnread
          ? Math.max(0, prev.unread - 1)
          : !wasUnread && nowUnread
            ? prev.unread + 1
            : prev.unread;
      return {
        items: applyLiveNotification(prev.items, notification),
        unread,
      };
    });
  }, []);

  useEffect(() => {
    let disposed = false;
    api
      .GET("/notifications", { params: { query: { limit: 50 } } })
      .then(({ data, error }) => {
        if (!disposed) {
          if (data) {
            setHeld((prev) => ({
              items: backfillItems(prev.items, data.items),
              unread: replaceUnread(prev.unread, data.unread),
            }));
            setFailure(null);
          } else {
            setFailure(
              errorMessage(error, "Notifications are unavailable right now."),
            );
          }
          setLoading(false);
        }
      });

    let missed = false;
    const source = new EventSource("/api/notifications/stream");
    source.onmessage = (event) => {
      try {
        apply(JSON.parse(event.data) as Notification);
        setFailure(null);
      } catch {
        setFailure("A notification could not be read.");
      }
    };
    source.onopen = () => {
      setConnected(true);
      // The browser reconnected on its own (Last-Event-ID resume). Recover
      // anything the tab missed while it couldn't hold a connection.
      if (missed) {
        missed = false;
        void load();
      }
    };
    source.onerror = () => {
      // Don't close or retry manually: EventSource reconnects with
      // Last-Event-ID by itself. Track the gap and surface the state.
      if (source.readyState !== EventSource.OPEN) {
        setConnected(false);
        missed = true;
      }
    };
    return () => {
      disposed = true;
      source.close();
    };
  }, [apply, load]);

  const markRead = useCallback(async (ids: readonly string[]) => {
    const { error } = await api.POST("/notifications/read", {
      body: { ids: [...ids] },
    });
    if (error) {
      setFailure("Marking as read didn't stick. Try again in a moment.");
      return false;
    }
    setHeld((prev) => ({
      items: prev.items.map((n) =>
        ids.includes(n.id) ? { ...n, read: true } : n,
      ),
      unread: adjustUnreadAfterMarkedRead(prev.items, prev.unread, ids),
    }));
    return true;
  }, []);

  const markAllRead = useCallback(async () => {
    const { error } = await api.POST("/notifications/read", {
      body: { all: true },
    });
    if (error) {
      setFailure(
        "Marking everything as read didn't stick. Try again in a moment.",
      );
      return false;
    }
    setHeld((prev) => ({
      items: prev.items.map((n) => ({ ...n, read: true })),
      unread: 0,
    }));
    return true;
  }, []);

  return { ...held, connected, failure, loading, markRead, markAllRead };
}

// Broadcast unread changes so the workspace-shell badge (web#11 wiring) can
// reflect them without opening a second stream.
export const NOTIFICATIONS_EVENT = "trybe:notifications";
