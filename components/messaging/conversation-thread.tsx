"use client";

import { Ban, ChevronLeft, Flag, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Alert,
  Avatar,
  Button,
  ButtonLink,
  Dialog,
  EmptyState,
  Field,
  Select,
  Skeleton,
  Textarea,
} from "@/components/ui";
import { api, errorMessage, type Schemas } from "@/lib/api/client";
import {
  MAX_MESSAGE_LENGTH,
  composerState,
  groupMessagesByDay,
  isOwnMessage,
  mergeMessages,
  messageTimeLabel,
  newestIncomingAt,
  olderPageCursor,
  shouldMarkRead,
  type Message,
} from "@/lib/messaging/thread";

import { useConversationLive } from "./use-conversation-live";

const PAGE_SIZE = 25;

const REPORT_REASONS = [
  "spam",
  "harassment",
  "impersonation",
  "inappropriate",
  "other",
] as const;
type ReportReason = (typeof REPORT_REASONS)[number];
const REPORT_LABELS: Record<ReportReason, string> = {
  spam: "Spam",
  harassment: "Harassment",
  impersonation: "Impersonation",
  inappropriate: "Inappropriate content",
  other: "Something else",
};

const LIVE_LABELS = {
  connecting: "Connecting…",
  retrying: "Reconnecting — messages will catch up.",
  polling: "Refreshing every few seconds.",
  offline: "Live updates aren't available; refresh to see new messages.",
  live: "",
} as const;

// The thread renders only what the API returned. It never invents a participant
// or a message, and a blocked or ended conversation keeps its history readable
// while the composer says why it is off.
export function ConversationThread({
  conversationId,
}: {
  conversationId: string;
}) {
  const [conversation, setConversation] = useState<
    Schemas["Conversation"] | null
  >(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [olderCursor, setOlderCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [missing, setMissing] = useState(false);
  const [loadFailure, setLoadFailure] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>("spam");
  const [reportDetails, setReportDetails] = useState("");
  const [reportFailure, setReportFailure] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendFailure, setSendFailure] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const lastMarkedAt = useRef<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [inbox, page] = await Promise.all([
        api.GET("/conversations"),
        api.GET("/conversations/{conversationId}/messages", {
          params: { path: { conversationId }, query: { limit: PAGE_SIZE } },
        }),
      ]);
      if (!active) return;
      const found =
        inbox.data?.items.find((item) => item.id === conversationId) ?? null;
      if (!found) {
        setMissing(true);
        setLoading(false);
        return;
      }
      if (page.error || !page.data) {
        setLoadFailure(
          errorMessage(
            page.error ?? inbox.error,
            "We couldn't load this conversation.",
          ),
        );
        setLoading(false);
        return;
      }
      setConversation(found);
      setMessages(mergeMessages([], page.data.items));
      setOlderCursor(olderPageCursor(page.data));
      setLoading(false);
    };
    void load();
    return () => {
      active = false;
    };
  }, [conversationId]);

  // Receipts are per conversation in the contract: mark it read when an
  // incoming message is newer than the last time we did, never for our own.
  useEffect(() => {
    if (!conversation) return;
    const otherAttendeeId = conversation.other.attendee_id;
    if (!shouldMarkRead(messages, otherAttendeeId, lastMarkedAt.current))
      return;
    lastMarkedAt.current = newestIncomingAt(messages, otherAttendeeId);
    void api
      .POST("/conversations/{conversationId}/read", {
        params: { path: { conversationId } },
      })
      .then(({ error }) => {
        if (error) {
          lastMarkedAt.current = null;
          return;
        }
        // The inbox badge listens for this after web#18 merges.
        window.dispatchEvent(new CustomEvent("trybe:inbox"));
      });
  }, [messages, conversation, conversationId]);

  const handleMessages = useCallback((incoming: Message[]) => {
    setMessages((held) => mergeMessages(held, incoming));
  }, []);

  const handleReconnect = useCallback(async () => {
    const { data } = await api.GET("/conversations/{conversationId}/messages", {
      params: { path: { conversationId }, query: { limit: PAGE_SIZE } },
    });
    if (data) setMessages((held) => mergeMessages(held, data.items));
  }, [conversationId]);

  const live = useConversationLive({
    conversationId,
    enabled: Boolean(conversation),
    onMessages: handleMessages,
    onReconnect: handleReconnect,
  });

  // Follow new messages only while the reader is already at the bottom, so
  // catching up on history isn't yanked away.
  const newestId = messages.at(-1)?.id;
  useEffect(() => {
    const list = listRef.current;
    if (!list || !stickToBottom.current) return;
    list.scrollTop = list.scrollHeight;
  }, [newestId]);

  async function loadOlder() {
    if (!olderCursor) return;
    const list = listRef.current;
    const previousHeight = list?.scrollHeight ?? 0;
    const previousTop = list?.scrollTop ?? 0;
    setLoadingOlder(true);
    const { data, error } = await api.GET(
      "/conversations/{conversationId}/messages",
      {
        params: {
          path: { conversationId },
          query: { cursor: olderCursor, limit: PAGE_SIZE },
        },
      },
    );
    setLoadingOlder(false);
    if (error || !data) {
      setSendFailure(errorMessage(error, "Earlier messages couldn't load."));
      return;
    }
    setMessages((held) => mergeMessages(held, data.items));
    setOlderCursor(olderPageCursor(data));
    stickToBottom.current = false;
    requestAnimationFrame(() => {
      if (list)
        list.scrollTop = list.scrollHeight - previousHeight + previousTop;
    });
  }

  const state = composerState({
    canSend: conversation?.can_send ?? false,
    blocked,
    sending,
    body,
  });

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!conversation || !state.canSubmit) return;
    const text = body.trim();
    setSending(true);
    setSendFailure(null);
    const { data, error } = await api.POST(
      "/conversations/{conversationId}/messages",
      {
        params: { path: { conversationId } },
        body: { body: text },
      },
    );
    setSending(false);
    if (error || !data) {
      if (error?.code === "blocked") setBlocked(true);
      setSendFailure(
        errorMessage(error, "Your message wasn't sent. Try again."),
      );
      return;
    }
    setBody("");
    setMessages((held) => mergeMessages(held, [data]));
    setConversation((current) =>
      current ? { ...current, last_message: data } : current,
    );
    stickToBottom.current = true;
    composerRef.current?.focus();
    window.dispatchEvent(new CustomEvent("trybe:inbox"));
  }

  async function confirmBlock() {
    if (!conversation) return;
    setBlocking(true);
    const { error } = await api.POST("/blocks", {
      body: { attendee_id: conversation.other.attendee_id },
    });
    setBlocking(false);
    if (error) {
      setBlockOpen(false);
      setSendFailure(errorMessage(error, "We couldn't block them. Try again."));
      return;
    }
    setBlocked(true);
    setBlockOpen(false);
    setNotice("Blocked. This conversation is now read-only.");
  }

  async function submitReport() {
    setReporting(true);
    setReportFailure(null);
    const { error } = await api.POST("/reports", {
      body: {
        target_type: "conversation",
        target_id: conversationId,
        reason: reportReason,
        details: reportDetails.trim() || undefined,
      },
    });
    setReporting(false);
    if (error) {
      setReportFailure(
        errorMessage(error, "The report wasn't sent. Try again."),
      );
      return;
    }
    setReportOpen(false);
    setReportDetails("");
    setReportReason("spam");
    setNotice("Report received. Our team will review it.");
  }

  if (loading) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 py-6">
        <Skeleton className="h-14" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-10 w-1/2 self-end" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="mt-8 h-16" />
      </div>
    );
  }

  if (missing || loadFailure || !conversation) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        {loadFailure ? (
          <Alert>{loadFailure}</Alert>
        ) : (
          <EmptyState
            title="This conversation isn't available."
            action={
              <ButtonLink href="/attendee/inbox">Back to inbox</ButtonLink>
            }
          >
            <p>
              It may have been removed, or it belongs to someone else&apos;s
              connections.
            </p>
          </EmptyState>
        )}
      </div>
    );
  }

  const other = conversation.other;
  const groups = groupMessagesByDay(messages);
  const liveLabel = LIVE_LABELS[live.status];

  return (
    <div className="mx-auto flex h-[calc(100dvh-8rem)] w-full max-w-2xl flex-col px-4 pt-4 pb-2 sm:h-[calc(100dvh-10rem)]">
      <header className="flex shrink-0 items-start gap-3 border-b border-line pb-3">
        <ButtonLink
          href="/attendee/inbox"
          variant="ghost"
          size="sm"
          aria-label="Back to inbox"
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </ButtonLink>
        <Avatar name={other.full_name} src={other.photo_url} size={40} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{other.full_name}</h1>
          {other.role && (
            <p className="truncate text-sm text-muted">
              {other.role}
              {other.organization ? ` · ${other.organization}` : ""}
            </p>
          )}
          {liveLabel && (
            <p role="status" className="text-xs text-muted">
              {liveLabel}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setBlockOpen(true)}
            disabled={blocked}
          >
            <Ban size={14} aria-hidden="true" /> Block
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setReportOpen(true)}>
            <Flag size={14} aria-hidden="true" /> Report
          </Button>
        </div>
      </header>

      {notice && (
        <p role="status" className="mt-3 text-sm font-medium text-success">
          {notice}
        </p>
      )}

      <div
        ref={listRef}
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label={`Conversation with ${other.full_name}`}
        onScroll={(event) => {
          const list = event.currentTarget;
          stickToBottom.current =
            list.scrollHeight - list.scrollTop - list.clientHeight < 120;
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3"
      >
        {olderCursor && (
          <div className="pb-3 text-center">
            <Button
              size="sm"
              variant="ghost"
              loading={loadingOlder}
              onClick={() => void loadOlder()}
            >
              Load earlier messages
            </Button>
          </div>
        )}

        {messages.length === 0 ? (
          <EmptyState title="No messages yet">
            <p>
              Say hello. You&apos;re connected, so this thread stays between the
              two of you.
            </p>
          </EmptyState>
        ) : (
          groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h2 className="py-2 text-center text-xs font-semibold tracking-wide text-muted uppercase">
                {group.label}
              </h2>
              <ol className="flex flex-col gap-2">
                {group.messages.map((message) => {
                  const mine = isOwnMessage(message, other.attendee_id);
                  return (
                    <li
                      key={message.id}
                      className={
                        mine ? "flex justify-end" : "flex justify-start"
                      }
                    >
                      <div
                        className={
                          mine
                            ? "max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-paper"
                            : "max-w-[85%] rounded-2xl rounded-bl-sm border border-line bg-surface px-4 py-2.5"
                        }
                      >
                        <span className="sr-only">
                          {mine ? "You" : other.full_name}:{" "}
                        </span>
                        <p className="text-sm break-words whitespace-pre-wrap">
                          {message.body}
                        </p>
                        <time
                          dateTime={message.created_at}
                          title={new Date(message.created_at).toLocaleString()}
                          className="mt-1 block text-right text-[11px] text-muted"
                        >
                          {messageTimeLabel(message.created_at)}
                        </time>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))
        )}
      </div>

      <form
        onSubmit={submit}
        className="shrink-0 border-t border-line bg-paper pt-3 pb-[env(safe-area-inset-bottom)]"
      >
        {sendFailure && (
          <div className="mb-2">
            <Alert>{sendFailure}</Alert>
          </div>
        )}
        <Field label="Message" error={state.reason ?? undefined}>
          {(fieldProps) => (
            <Textarea
              {...fieldProps}
              ref={composerRef}
              rows={2}
              value={body}
              disabled={state.locked || sending}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder={
                state.locked ? "Messaging is off" : "Write a message…"
              }
              className="min-h-11 resize-none"
            />
          )}
        </Field>
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-xs text-muted">
            {state.length > MAX_MESSAGE_LENGTH
              ? `${state.length} / ${MAX_MESSAGE_LENGTH}`
              : "Enter to send · Shift+Enter for a new line"}
          </p>
          <Button
            type="submit"
            size="sm"
            loading={sending}
            disabled={!state.canSubmit}
          >
            <Send size={14} aria-hidden="true" /> Send
          </Button>
        </div>
      </form>

      <Dialog
        open={blockOpen}
        onClose={() => setBlockOpen(false)}
        title={`Block ${other.full_name}?`}
        description="They won't be able to message you, and this conversation becomes read-only. You can unblock them later."
        actions={
          <>
            <Button variant="secondary" onClick={() => setBlockOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={blocking}
              onClick={() => void confirmBlock()}
            >
              Block
            </Button>
          </>
        }
      />

      <Dialog
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report this conversation"
        description="Reports are private. The other person isn't told."
        actions={
          <>
            <Button variant="secondary" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button loading={reporting} onClick={() => void submitReport()}>
              Send report
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {reportFailure && <Alert>{reportFailure}</Alert>}
          <Field label="Reason">
            {(fieldProps) => (
              <Select
                {...fieldProps}
                value={reportReason}
                onChange={(event) =>
                  setReportReason(event.target.value as ReportReason)
                }
              >
                {REPORT_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {REPORT_LABELS[reason]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Details" optional>
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                value={reportDetails}
                maxLength={1000}
                onChange={(event) => setReportDetails(event.target.value)}
              />
            )}
          </Field>
        </div>
      </Dialog>
    </div>
  );
}
