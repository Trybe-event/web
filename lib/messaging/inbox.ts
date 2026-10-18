// Pure rules for the inbox (web#18). JSX-free so node --test can enforce them.
// The inbox only ever renders conversations the API returned — it never derives
// one from a profile or request — and a live message notification only tells it
// to refetch the counts, so the client never invents an unread total.

import type { components } from "@/lib/api/schema";

export type Conversation = components["schemas"]["Conversation"];
export type UnreadTotals = { messages: number; notifications: number };

/**
 * The message half of GET /me/unread. Notifications have their own badge, and
 * a missing or malformed total must never render as a negative count.
 */
export function unreadMessages(
  totals: UnreadTotals | null | undefined,
): number {
  const count = totals?.messages;
  return typeof count === "number" && Number.isFinite(count)
    ? Math.max(0, Math.trunc(count))
    : 0;
}

/** A badge number, or null when there is nothing to announce. */
export function badgeCount(unread: number): string | null {
  if (unread <= 0) return null;
  return unread > 99 ? "99+" : String(unread);
}

/**
 * True when a streamed notification means the message totals may have changed.
 * Only an unread `message` notification moves them; a read one is history, and
 * connection or organizer notifications belong to the other badge.
 */
export function refreshesInbox(notification: {
  kind: components["schemas"]["Notification"]["kind"];
  read: boolean;
}): boolean {
  return notification.kind === "message" && !notification.read;
}

/**
 * Newest conversation first, by the timestamp of its last message. A
 * conversation with no messages yet sorts after ones with history, and the id
 * keeps the order stable when two messages share a timestamp.
 */
export function byLatestMessage(a: Conversation, b: Conversation): number {
  const aTime = a.last_message?.created_at;
  const bTime = b.last_message?.created_at;
  if (aTime && bTime && aTime !== bTime) return bTime.localeCompare(aTime);
  if (aTime && !bTime) return -1;
  if (!aTime && bTime) return 1;
  return a.id.localeCompare(b.id);
}

/** Sorted copy; the API list is left untouched. */
export function orderedConversations(
  items: readonly Conversation[],
): Conversation[] {
  return [...items].sort(byLatestMessage);
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * "14:05" for today, "Yesterday" for yesterday, a short date for anything
 * older. `now` is passed in so the label is testable and both cards in one
 * render agree on what "today" means.
 */
export function conversationTimeLabel(iso: string, now: Date): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  if (sameDay(at, now)) {
    return at.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(at, yesterday)) return "Yesterday";
  return at.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** The machine-readable timestamp for <time>; null when there is no message. */
export function conversationTimestamp(
  conversation: Conversation,
): string | null {
  return conversation.last_message?.created_at ?? null;
}
