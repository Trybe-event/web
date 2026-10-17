"use client";

import { useState } from "react";
import { Bell, Check, X } from "lucide-react";

import {
  Alert,
  Avatar,
  Badge,
  Button,
  ButtonLink,
  EmptyState,
  Skeleton,
  useToast,
} from "@/components/ui";
import { api, errorMessage } from "@/lib/api/client";
import type { Schemas } from "@/lib/api/client";

import {
  NOTIFICATIONS_EVENT,
  useNotificationStream,
} from "./use-notification-stream";

const KIND_LABELS: Record<Schemas["Notification"]["kind"], string> = {
  connection_request: "Connection request",
  connection_accepted: "Connected",
  message: "Message",
  organizer_update: "Event update",
};

// The order to act: newest first, like the API list.
function timeLabel(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function broadcastUnread(unread: number) {
  if (typeof window !== "undefined")
    window.dispatchEvent(
      new CustomEvent(NOTIFICATIONS_EVENT, { detail: { unread } }),
    );
}

export function NotificationCenter() {
  const { items, unread, connected, failure, loading, markRead, markAllRead } =
    useNotificationStream();
  const [actingId, setActingId] = useState<string | null>(null);
  const toast = useToast();

  broadcastUnread(unread);

  async function act(
    notification: Schemas["Notification"],
    action: "accept" | "reject",
  ) {
    if (!notification.subject_id || notification.kind !== "connection_request")
      return;
    setActingId(notification.id);
    const { data, error } = await api.POST(
      "/connection-requests/{requestId}/{action}",
      {
        params: { path: { requestId: notification.subject_id, action } },
      },
    );
    setActingId(null);
    if (error) {
      toast(errorMessage(error, `The request wasn't ${action}ed. Try again.`));
      return;
    }
    if (data) toast(action === "accept" ? "Connected." : "Request declined.");
    // The acted request stays in the list, just already read — the decision
    // never disappears.
    await markRead([notification.id]);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          Notifications
          {unread > 0 && <UnreadBadge unread={unread} />}
        </h1>
        <div className="flex gap-2">
          <ButtonLink
            href="/attendee/notifications/preferences"
            variant="secondary"
            size="sm"
          >
            Preferences
          </ButtonLink>
          {unread > 0 && (
            <Button
              size="sm"
              onClick={async () => {
                if (await markAllRead()) toast("All caught up.");
              }}
            >
              Mark all read
            </Button>
          )}
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">
        {connected
          ? "Live — new notifications arrive on their own."
          : loading
            ? "Loading…"
            : "Reconnecting — missed updates will appear here."}
      </p>

      {failure && (
        <div className="mt-4">
          <Alert>{failure}</Alert>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {loading && items.length === 0 && (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </>
        )}
        {!loading && items.length === 0 && (
          <EmptyState title="No notifications yet">
            Connection requests, replies and event updates show up here.
          </EmptyState>
        )}
        {items.map((n) => (
          <article
            key={n.id}
            className={
              n.read
                ? "flex items-start gap-3 rounded-xl border border-line bg-surface p-4"
                : "flex items-start gap-3 rounded-xl border border-lime bg-surface p-4"
            }
          >
            {"actor" in n && n.actor?.full_name ? (
              <Avatar name={n.actor.full_name} size={36} />
            ) : (
              <span
                aria-hidden="true"
                className="mt-0.5 rounded-full bg-lime p-2 text-lime-ink"
              >
                <Bell size={16} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {!n.read && (
                  <span
                    aria-label="Unread"
                    className="inline-block size-2 rounded-full bg-accent-ink"
                  />
                )}
                <Badge>{KIND_LABELS[n.kind]}</Badge>
                <span className="text-xs text-muted">
                  {timeLabel(n.created_at)}
                </span>
              </div>
              <p className="mt-1 text-sm font-semibold">{n.text}</p>
              {n.kind === "connection_request" && n.subject_id && (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    loading={actingId === n.id}
                    onClick={() => act(n, "accept")}
                  >
                    <Check size={14} aria-hidden="true" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={actingId === n.id}
                    onClick={() => act(n, "reject")}
                  >
                    <X size={14} aria-hidden="true" /> Reject
                  </Button>
                </div>
              )}
              {n.kind !== "connection_request" && !n.read && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void markRead([n.id])}
                  >
                    Mark read
                  </Button>
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function UnreadBadge({ unread }: { unread: number }) {
  return (
    <span
      aria-label={`${unread} unread notifications`}
      className="ml-2 inline-flex min-w-6 items-center justify-center rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-paper"
    >
      {unread > 99 ? "99+" : unread}
    </span>
  );
}
