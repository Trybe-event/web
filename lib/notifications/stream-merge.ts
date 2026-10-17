// Pure rules for the attendee notification center (web#16). JSX-free so node
// --test can enforce them: after an offline gap the reconnect backfill must
// show missed notifications exactly once, and a preference change must never
// delete anything — the list renders whatever the API returns.

import type { components } from "@/lib/api/schema";

export type Notification = components["schemas"]["Notification"];

export type NotificationPage = {
  items: Notification[];
  unread: number;
  next_cursor: string | null;
};

// Newest first, matching the list endpoint's contract. Ties break on id so
// order stays stable across rebuilds.
export function byNewestFirst(a: Notification, b: Notification): number {
  const byTime = b.created_at.localeCompare(a.created_at);
  return byTime !== 0 ? byTime : b.id.localeCompare(a.id);
}

/**
 * Apply one live SSE notification to the held items.
 * - A previously unseen id is added (the caller counts it toward unread when
 *   `read` is false).
 * - An id we already hold is replaced IN PLACE by the live record (the server
 *   may have updated `read` or the status), never appended — no duplicates.
 * - Order stays newest first.
 */
export function applyLiveNotification(
  items: Notification[],
  incoming: Notification,
): Notification[] {
  const withoutIncoming = items.filter(
    (existing) => existing.id !== incoming.id,
  );
  return [...withoutIncoming, incoming].sort(byNewestFirst);
}

/** True when the id wasn't in the held items before being applied. */
export function isNewNotification(
  items: Notification[],
  incoming: Notification,
): boolean {
  return !items.some((existing) => existing.id === incoming.id);
}

/**
 * Merge a list page fetched after a reconnect into the held items. Every item
 * not already present is inserted once; present ones are updated in place
 * (server truth wins), which is why nothing is shown twice and missed
 * notifications aren't lost.
 */
export function backfillItems(
  items: Notification[],
  pageItems: Notification[],
): Notification[] {
  const held = new Map(items.map((n) => [n.id, n]));
  for (const incoming of pageItems) held.set(incoming.id, incoming);
  return [...held.values()].sort(byNewestFirst);
}

/**
 * After a reconnect the server's `unread` count is authoritative: it counts
 * everything, not just the page held in memory. The initial load follows the
 * same rule, so a stale client count never survives a reconnect.
 */
export function replaceUnread(
  current: number | null,
  authoritative: number,
): number {
  void current;
  return authoritative;
}

/**
 * Optimistically fold the ids being marked read into the unread count. The
 * negative case guards against double-subtracting: only items that are
 * actually unread reduce the count, and it never goes below zero.
 */
export function adjustUnreadAfterMarkedRead(
  items: Notification[],
  unread: number,
  ids: readonly string[],
): number {
  const marked = new Set(ids);
  const actuallyUnread = items.filter(
    (n) => !n.read && marked.has(n.id),
  ).length;
  return Math.max(0, unread - actuallyUnread);
}

/**
 * Preferences only affect future delivery. The client never drops items when
 * a category is switched off — the API decides what to stop sending. This is
 * the list's single update path on a preference save: unchanged.
 */
export function itemsAfterPreferenceChange(
  items: Notification[],
): Notification[] {
  return items;
}
