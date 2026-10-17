"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { Avatar, Badge, Card, EmptyState, Skeleton } from "@/components/ui";
import { api, errorMessage, type Schemas } from "@/lib/api/client";

export function InboxList() {
  const [conversations, setConversations] = useState<Schemas["Conversation"][]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      api.GET("/conversations").then(({ data, error }) => {
        if (cancelled) return;
        if (data) return data.items;
        throw error;
      }),
      api.GET("/me/unread").then(({ data, error }) => {
        if (cancelled) return;
        if (data) return data;
        throw error;
      }),
    ])
      .then(([items]) => {
        if (cancelled) return;
        setConversations(items ?? []);
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setFailure(errorMessage(error, "We couldn't load your inbox."));
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="workspace">
      <header className="workspace-header">
        <Link href="/attendee" aria-label="Trybe workspace home">
          <span className="workspace-logo">Trybe</span>
        </Link>
        <div>
          <span className="workspace-badge">Attendee workspace</span>
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-bold">Inbox</h1>
        <p className="mt-2 text-muted">
          Messages from people you&apos;re connected with at your events.
        </p>

        {failure && (
          <div className="mt-6 rounded-lg border border-danger/20 bg-danger/5 p-4">
            {failure}
          </div>
        )}

        {loading ? (
          <div className="mt-8 flex flex-col gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : conversations.length === 0 ? (
          <EmptyState title="No messages yet">
            <p className="text-muted">
              When someone accepts your connection request, you&apos;ll be able
              to message them here. Until then, explore the event to find people
              to connect with.
            </p>
          </EmptyState>
        ) : (
          <div className="mt-6 flex flex-col gap-3">
            {conversations.map((conv) => (
              <ConversationCard key={conv.id} conversation={conv} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function ConversationCard({
  conversation,
}: {
  conversation: Schemas["Conversation"];
}) {
  const other = conversation.other;
  const unread = conversation.unread;
  const lastMessage = conversation.last_message;
  const canSend = conversation.can_send;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar name={other.full_name} src={other.photo_url} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold truncate">{other.full_name}</p>
            {unread > 0 && <Badge>{unread} new</Badge>}
          </div>
          {other.role && (
            <p className="text-sm text-muted">
              {other.role}
              {other.organization ? ` · ${other.organization}` : ""}
            </p>
          )}
          {lastMessage && (
            <p className="mt-1 text-sm text-muted line-clamp-2">
              {lastMessage.body}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            {new Date().toLocaleDateString("en-GB")}
          </p>
        </div>
        {!canSend && <Badge tone="neutral">Connection ended</Badge>}
      </div>
      {other.bio && <p className="text-sm text-muted">{other.bio}</p>}
      {other.skills && other.skills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {other.skills.map((s) => (
            <Badge key={s}>{s}</Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
