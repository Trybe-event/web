"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  INBOX_UPDATED_EVENT,
  useInboxLive,
} from "@/components/messaging/use-inbox-live";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Skeleton,
} from "@/components/ui";
import type { Schemas } from "@/lib/api/client";
import {
  conversationTimeLabel,
  conversationTimestamp,
} from "@/lib/messaging/inbox";
import { loadInboxSnapshot } from "@/lib/messaging/inbox-read";

// The inbox lists exactly what GET /conversations returns: the API only creates
// a conversation for an accepted connection, so nothing is derived here from a
// profile, a request or a connection list. `can_send` is false once the
// connection ends; the thread stays readable and the card says so.
export function InboxList() {
  const [conversations, setConversations] = useState<Schemas["Conversation"][]>(
    [],
  );
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);
  const revision = useInboxLive();
  const [retryRevision, setRetryRevision] = useState(0);
  // One "now" per render so every card agrees on today and yesterday.
  const [now] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    const abort = new AbortController();

    const load = async () => {
      setLoading(true);
      const result = await loadInboxSnapshot(abort.signal);
      if (cancelled) return;
      if (result.kind === "unavailable") {
        setConversations([]);
        setFailure(result.message);
        setLoading(false);
        return;
      }

      setConversations(result.conversations);
      const messages = result.unread;
      setUnread(messages);
      setFailure(null);
      setLoading(false);
      // The nav badge shares the count without a second stream.
      window.dispatchEvent(
        new CustomEvent(INBOX_UPDATED_EVENT, { detail: { messages } }),
      );
    };

    void load();
    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [revision, retryRevision]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Inbox</h1>
        {!loading && !failure && unread > 0 && (
          <Badge tone="accent" aria-label={`${unread} unread messages`}>
            {unread} unread
          </Badge>
        )}
      </div>
      <p className="mt-2 text-muted">
        Messages from people you&apos;re connected with at your events.
      </p>

      {failure && (
        <div className="mt-6">
          <Alert>{failure}</Alert>
          <Button
            className="mt-3"
            variant="secondary"
            onClick={() => setRetryRevision((value) => value + 1)}
            disabled={loading}
          >
            Reload inbox
          </Button>
        </div>
      )}

      {loading ? (
        <div className="mt-8 flex flex-col gap-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : conversations.length === 0 && !failure ? (
        <div className="mt-6">
          <EmptyState
            title="No messages yet"
            action={
              <ButtonLink href="/attendee/connections">
                Find people to connect with
              </ButtonLink>
            }
          >
            <p>
              When someone accepts your connection request, your conversation
              appears here. Until then, find people to connect with at your
              events.
            </p>
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              now={now}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConversationCard({
  conversation,
  now,
}: {
  conversation: Schemas["Conversation"];
  now: Date;
}) {
  const other = conversation.other;
  const lastMessage = conversation.last_message;
  const timestamp = conversationTimestamp(conversation);

  // The card is the way into the thread (web#19); its accessible name is the
  // person plus the unread count, not every line of the preview.
  return (
    <Link
      href={`/attendee/inbox/${conversation.id}`}
      aria-label={
        conversation.unread > 0
          ? `Open conversation with ${other.full_name}, ${conversation.unread} unread`
          : `Open conversation with ${other.full_name}`
      }
      className="block rounded-xl"
    >
      <Card className="flex items-start gap-3 transition-colors hover:bg-paper">
        <Avatar name={other.full_name} src={other.photo_url} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold">{other.full_name}</p>
            {conversation.unread > 0 && (
              <Badge
                tone="accent"
                aria-label={`${conversation.unread} unread messages`}
              >
                {conversation.unread} new
              </Badge>
            )}
            {!conversation.can_send && (
              <Badge tone="neutral">Connection ended</Badge>
            )}
          </div>
          {other.role && (
            <p className="text-sm text-muted">
              {other.role}
              {other.organization ? ` · ${other.organization}` : ""}
            </p>
          )}
          <p className="mt-1 line-clamp-2 text-sm text-muted">
            {lastMessage ? lastMessage.body : "No messages yet."}
          </p>
        </div>
        {timestamp && (
          <time
            dateTime={timestamp}
            className="shrink-0 text-xs text-muted"
            title={new Date(timestamp).toLocaleString()}
          >
            {conversationTimeLabel(timestamp, now)}
          </time>
        )}
      </Card>
    </Link>
  );
}
