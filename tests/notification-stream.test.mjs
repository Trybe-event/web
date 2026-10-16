// Unit tests for the notification center rules (web#16), run with node --test.
// The pure module lib/notifications/stream-merge.ts holds the rules the
// acceptance criteria care about; the SSE hook and screens compose it.
import test from "node:test";
import assert from "node:assert/strict";

import {
  applyLiveNotification,
  isNewNotification,
  backfillItems,
  replaceUnread,
  adjustUnreadAfterMarkedRead,
  itemsAfterPreferenceChange,
  byNewestFirst,
} from "../lib/notifications/stream-merge.ts";

const notif = (
  id,
  { at = "2026-10-16T10:00:00Z", read = false, kind = "message" } = {},
) => ({
  id,
  kind,
  created_at: at,
  read,
  text: "Tomi requested to connect.",
});

test("a live notification appears exactly once, newest first", () => {
  const items = [notif("b", { at: "2026-10-16T09:00:00Z" })];
  const newer = notif("a", { at: "2026-10-16T11:00:00Z" });
  const once = applyLiveNotification(items, newer);
  assert.deepEqual(
    once.map((n) => n.id),
    ["a", "b"],
  );
  // Retransmitted SSE event (server retry, page restored): no duplicate.
  const twice = applyLiveNotification(once, newer);
  assert.deepEqual(
    twice.map((n) => n.id),
    ["a", "b"],
  );
});

test("a retransmitted event updates in place instead of duplicating", () => {
  const items = [notif("a", { read: false }), notif("b")];
  const updated = notif("b", { read: true });
  const merged = applyLiveNotification(items, updated);
  assert.equal(merged.length, 2);
  assert.equal(merged.find((n) => n.id === "b").read, true);
});

test("isNewNotification detects the first delivery of an id", () => {
  const items = [notif("a")];
  assert.equal(isNewNotification(items, notif("b")), true);
  assert.equal(isNewNotification(items, notif("a")), false);
});

test("reconnect backfill inserts missed items once and adopts server truth", () => {
  const held = [notif("old-1", { at: "2026-10-16T08:00:00Z" }), notif("old-2")];
  // Page fetched with Last-Event-ID after the gap: one missed item, plus a
  // fresh copy of one we already hold (server marked it read meanwhile).
  const page = [
    notif("missed", { at: "2026-10-16T09:30:00Z" }),
    notif("old-2", { read: true }),
  ];
  const merged = backfillItems(held, page);
  assert.deepEqual(
    merged.map((n) => n.id),
    ["old-2", "missed", "old-1"],
  );
  assert.equal(merged.find((n) => n.id === "old-2").read, true);
  // Backfilling the same page again must not duplicate or reorder truth.
  const again = backfillItems(merged, page);
  assert.equal(again.length, 3);
  assert.deepEqual(again, merged);
});

test("the server's unread count always wins over a stale client count", () => {
  assert.equal(replaceUnread(7, 3), 3);
  assert.equal(replaceUnread(null, 0), 0);
});

test("marking read only counts ids that were actually unread", () => {
  const items = [notif("a"), notif("b", { read: true }), notif("c")];
  assert.equal(adjustUnreadAfterMarkedRead(items, 2, ["a", "b"]), 1);
  assert.equal(adjustUnreadAfterMarkedRead(items, 2, ["a"]), 1);
  // Double-mark (retry after success) must not go negative.
  assert.equal(adjustUnreadAfterMarkedRead(items, 2, ["a", "c"]), 0);
  assert.equal(adjustUnreadAfterMarkedRead([notif("a")], 0, ["a"]), 0);
});

test("switching a category off never removes underlying notifications", () => {
  const items = [
    notif("a", { kind: "connection_request" }),
    notif("b", { kind: "message" }),
  ];
  assert.equal(itemsAfterPreferenceChange(items), items);
  assert.equal(itemsAfterPreferenceChange(items).length, 2);
});

test("order is newest first with a stable tiebreak on id", () => {
  const a = notif("aaa", { at: "2026-10-16T10:00:00Z" });
  const b = notif("bbb", { at: "2026-10-16T10:00:00Z" });
  assert.deepEqual(
    [b, a].sort(byNewestFirst).map((n) => n.id),
    ["bbb", "aaa"],
  );
});
