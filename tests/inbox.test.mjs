// Unit tests for the inbox rules (web#18), run with node --test. The pure
// module lib/messaging/inbox.ts holds the rules the acceptance criteria care
// about; the screen and the nav badge compose it.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Some Node builds ship without TypeScript support, so transpile the real
// module the same way tests/events.test.mjs does. Its only import is type-only,
// which means it needs no dependencies once compiled.
function inboxModule() {
  const source = readFileSync(
    new URL("../lib/messaging/inbox.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  const run = vm.runInNewContext(
    `(function(require,module,exports){${compiled}\n})`,
    {},
  );
  run(
    (name) => {
      throw new Error(`Unexpected dependency: ${name}`);
    },
    compiledModule,
    compiledModule.exports,
  );
  return compiledModule.exports;
}

// Values built inside the vm context have that context's prototypes, so compare
// plain copies of them rather than the objects themselves.
const plain = (value) => structuredClone(value);

const {
  badgeCount,
  byLatestMessage,
  conversationTimeLabel,
  conversationTimestamp,
  orderedConversations,
  refreshesInbox,
  unreadMessages,
} = inboxModule();

const conversation = (id, at) => ({
  id,
  connection_id: `connection-${id}`,
  other: { attendee_id: `attendee-${id}`, full_name: "Tomi Ade" },
  ...(at
    ? {
        last_message: {
          id: `message-${id}`,
          conversation_id: id,
          sender_id: `attendee-${id}`,
          body: "Hello",
          created_at: at,
        },
      }
    : {}),
  unread: 0,
  can_send: true,
});

test("conversations are newest first and a thread with no messages comes last", () => {
  const items = [
    conversation("old", "2026-10-14T09:00:00Z"),
    conversation("empty"),
    conversation("new", "2026-10-16T11:00:00Z"),
  ];
  assert.deepEqual(plain(orderedConversations(items).map((c) => c.id)), [
    "new",
    "old",
    "empty",
  ]);
});

test("equal timestamps keep a stable order and the API list is not mutated", () => {
  const items = [
    conversation("b", "2026-10-16T10:00:00Z"),
    conversation("a", "2026-10-16T10:00:00Z"),
  ];
  const sorted = orderedConversations(items);
  assert.deepEqual(plain(sorted.map((c) => c.id)), ["a", "b"]);
  assert.deepEqual(
    plain(items.map((c) => c.id)),
    ["b", "a"],
    "sorting returns a copy",
  );
  assert.equal(byLatestMessage(sorted[0], sorted[1]) < 0, true);
});

test("a message notification refreshes the totals, other kinds do not", () => {
  assert.equal(refreshesInbox({ kind: "message", read: false }), true);
  // Negative cases: nothing to recount for an already-read message, and the
  // connection/organizer categories belong to the notification badge.
  assert.equal(refreshesInbox({ kind: "message", read: true }), false);
  assert.equal(
    refreshesInbox({ kind: "connection_accepted", read: false }),
    false,
  );
  assert.equal(
    refreshesInbox({ kind: "connection_request", read: false }),
    false,
  );
  assert.equal(
    refreshesInbox({ kind: "organizer_update", read: false }),
    false,
  );
});

test("the message total is taken from /me/unread and never goes negative", () => {
  assert.equal(unreadMessages({ messages: 3, notifications: 9 }), 3);
  assert.equal(unreadMessages({ messages: 0, notifications: 9 }), 0);
  // Negative cases: a missing or malformed total must not render as an error
  // count or a negative badge.
  assert.equal(unreadMessages(null), 0);
  assert.equal(unreadMessages({ messages: -2, notifications: 0 }), 0);
  assert.equal(unreadMessages({ messages: Number.NaN, notifications: 0 }), 0);
});

test("badge counts cap at 99+ and vanish at zero", () => {
  assert.equal(badgeCount(0), null);
  assert.equal(badgeCount(-1), null);
  assert.equal(badgeCount(1), "1");
  assert.equal(badgeCount(99), "99");
  assert.equal(badgeCount(100), "99+");
  assert.equal(badgeCount(1234), "99+");
});

test("the timestamp label separates today, yesterday and older messages", () => {
  const now = new Date("2026-10-16T12:00:00");
  assert.equal(
    conversationTimeLabel("2026-10-16T08:30:00", now),
    new Date("2026-10-16T08:30:00").toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
  assert.equal(conversationTimeLabel("2026-10-15T22:00:00", now), "Yesterday");
  assert.equal(
    conversationTimeLabel("2026-10-10T22:00:00", now),
    new Date("2026-10-10T22:00:00").toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    }),
  );
  // An unparseable timestamp renders as nothing rather than "Invalid Date".
  assert.equal(conversationTimeLabel("not-a-date", now), "");
});

test("a conversation without a last message has no timestamp", () => {
  assert.equal(conversationTimestamp(conversation("empty")), null);
  assert.equal(
    conversationTimestamp(conversation("a", "2026-10-16T10:00:00Z")),
    "2026-10-16T10:00:00Z",
  );
});
