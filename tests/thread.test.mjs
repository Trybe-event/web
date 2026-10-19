// Unit tests for the conversation thread rules (web#19), run with node --test.
// The pure modules hold the rules the acceptance criteria care about: history
// merges without gaps or duplicates, day separators follow the viewer's
// timezone, and the composer only enables when messaging is allowed.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Some Node builds ship without TypeScript support, so transpile the real
// modules the same way tests/inbox.test.mjs does. Both only use type imports,
// which means they need no dependencies once compiled.
function loadModule(relativePath) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  // The socket URL helper needs the standard URL classes; a fresh vm context
  // doesn't inherit them.
  const run = vm.runInNewContext(
    `(function(require,module,exports){${compiled}\n})`,
    { URL, URLSearchParams },
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
  composerState,
  groupMessagesByDay,
  isOwnMessage,
  mergeMessages,
  messageTimeLabel,
  newestIncomingAt,
  olderPageCursor,
  shouldMarkRead,
} = loadModule("../lib/messaging/thread.ts");

const {
  chatSocketUrl,
  parseServerFrame,
  reconnectDelay,
  shouldReconnect,
  subscribeFrame,
} = loadModule("../lib/messaging/chat-socket.ts");

const OTHER = "attendee-other";

const message = (id, createdAt, sender = OTHER, body = "Hello") => ({
  id,
  conversation_id: "conversation-1",
  sender_id: sender,
  body,
  created_at: createdAt,
});

test("merging messages dedupes by id, sorts oldest first and keeps the newest copy", () => {
  const held = [
    message("m2", "2026-10-16T10:18:00Z"),
    message("m1", "2026-10-16T10:15:00Z"),
  ];
  const incoming = [
    message("m3", "2026-10-16T10:20:00Z"),
    message("m2", "2026-10-16T10:18:00Z", OTHER, "Edited?"),
  ];
  const merged = plain(mergeMessages(held, incoming));
  assert.deepEqual(
    merged.map((item) => item.id),
    ["m1", "m2", "m3"],
  );
  assert.equal(merged[1].body, "Edited?", "the fetched copy wins");
  assert.equal(merged.length, 3, "no duplicates");
});

test("a reconnect backfill closes gaps without repeating held messages", () => {
  const held = [
    message("m1", "2026-10-16T10:00:00Z"),
    message("m2", "2026-10-16T10:05:00Z"),
  ];
  // The socket was down for m3; the newest REST page returns m2 and m3.
  const page = [
    message("m4", "2026-10-16T10:20:00Z", "attendee-me"),
    message("m3", "2026-10-16T10:10:00Z"),
    message("m2", "2026-10-16T10:05:00Z"),
  ];
  const merged = plain(mergeMessages(held, page));
  assert.deepEqual(
    merged.map((item) => item.id),
    ["m1", "m2", "m3", "m4"],
    "no gap and no duplicate after reconnecting",
  );
});

test("an older page that overlaps the held page adds no duplicate", () => {
  const held = [
    message("m2", "2026-10-16T10:05:00Z"),
    message("m3", "2026-10-16T10:10:00Z"),
  ];
  const older = [
    message("m0", "2026-10-16T09:50:00Z"),
    message("m1", "2026-10-16T10:00:00Z"),
    message("m2", "2026-10-16T10:05:00Z"),
  ];
  const merged = plain(mergeMessages(held, older));
  assert.deepEqual(
    merged.map((item) => item.id),
    ["m0", "m1", "m2", "m3"],
  );
});

test("the older page cursor is null only when history is exhausted", () => {
  assert.equal(olderPageCursor({ items: [], next_cursor: "m1" }), "m1");
  assert.equal(olderPageCursor({ items: [], next_cursor: null }), null);
  assert.equal(olderPageCursor({ items: [] }), null);
  assert.equal(olderPageCursor(null), null);
});

test("own messages are the ones the other participant did not send", () => {
  assert.equal(
    isOwnMessage(message("m1", "2026-10-16T10:00:00Z"), OTHER),
    false,
  );
  assert.equal(
    isOwnMessage(message("m2", "2026-10-16T10:00:00Z", "attendee-me"), OTHER),
    true,
  );
});

test("day separators group by local day and label today, yesterday and older", () => {
  const now = new Date(2026, 9, 16, 12, 0, 0);
  const groups = plain(
    groupMessagesByDay(
      [
        message("m1", "2026-10-15T22:00:00"),
        message("m2", "2026-10-16T08:30:00"),
        message("m3", "2026-10-16T09:30:00"),
        message("m4", "2025-03-02T10:00:00"),
      ],
      now,
    ),
  );
  assert.deepEqual(
    groups.map((group) => group.label),
    [
      "Yesterday",
      "Today",
      new Date(2025, 2, 2).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
    ],
  );
  assert.equal(groups[1].messages.length, 2, "a day is one section");
  assert.match(groups[2].label, /2025/, "another year is spelled out");
});

test("an unparseable timestamp starts no day section and no time label", () => {
  assert.deepEqual(
    plain(groupMessagesByDay([message("m1", "not-a-date")])),
    [],
  );
  assert.equal(messageTimeLabel("not-a-date"), "");
});

test("the composer locks with a reason for a block or an ended connection", () => {
  const blocked = composerState({
    canSend: true,
    blocked: true,
    sending: false,
    body: "Hello",
  });
  assert.equal(blocked.locked, true);
  assert.match(blocked.reason, /blocked/i);

  const ended = composerState({
    canSend: false,
    blocked: false,
    sending: false,
    body: "Hello",
  });
  assert.equal(ended.locked, true);
  assert.match(ended.reason, /ended/i);

  // A block is the more specific reason when both are true.
  const both = composerState({
    canSend: false,
    blocked: true,
    sending: false,
    body: "",
  });
  assert.match(both.reason, /blocked/i);
});

test("the composer refuses empty and over-long text but stays typeable", () => {
  const empty = composerState({
    canSend: true,
    blocked: false,
    sending: false,
    body: "   ",
  });
  assert.equal(empty.locked, false);
  assert.equal(empty.canSubmit, false);
  assert.equal(empty.reason, null);

  const tooLong = composerState({
    canSend: true,
    blocked: false,
    sending: false,
    body: "x".repeat(4001),
  });
  assert.equal(tooLong.locked, false, "the text can still be edited");
  assert.equal(tooLong.canSubmit, false);
  assert.match(tooLong.reason, /4,000/);

  const sending = composerState({
    canSend: true,
    blocked: false,
    sending: true,
    body: "Hello",
  });
  assert.equal(sending.canSubmit, false, "no double send");

  const valid = composerState({
    canSend: true,
    blocked: false,
    sending: false,
    body: "  Hello  ",
  });
  assert.equal(valid.locked, false);
  assert.equal(valid.canSubmit, true);
  assert.equal(valid.reason, null);
  assert.equal(valid.length, 5);
});

test("read receipts only fire for newer incoming messages", () => {
  const own = message("m1", "2026-10-16T10:00:00Z", "attendee-me");
  assert.equal(newestIncomingAt([own], OTHER), null);
  assert.equal(shouldMarkRead([own], OTHER, null), false);

  const incoming = message("m2", "2026-10-16T10:05:00Z");
  assert.equal(newestIncomingAt([own, incoming], OTHER), incoming.created_at);
  assert.equal(shouldMarkRead([own, incoming], OTHER, null), true);
  assert.equal(
    shouldMarkRead([incoming], OTHER, "2026-10-16T10:05:00Z"),
    false,
    "already marked read",
  );
  assert.equal(
    shouldMarkRead([incoming], OTHER, "2026-10-16T10:06:00Z"),
    false,
    "an older message needs no receipt",
  );
});

test("the socket URL upgrades the API origin and carries the ticket", () => {
  assert.equal(
    chatSocketUrl("http://localhost:8080", "ticket-1"),
    "ws://localhost:8080/ws?ticket=ticket-1",
  );
  assert.equal(
    chatSocketUrl("https://api.trybe.example/", "a b"),
    "wss://api.trybe.example/ws?ticket=a+b",
  );
  assert.equal(chatSocketUrl("not a url", "t"), null);
  assert.equal(chatSocketUrl("ftp://api.trybe.example", "t"), null);
});

test("only a message or error frame is acted on", () => {
  assert.deepEqual(plain(subscribeFrame("conversation-1")), {
    type: "subscribe",
    conversation_id: "conversation-1",
  });
  const frame = message("m1", "2026-10-16T10:00:00Z");
  assert.deepEqual(
    plain(parseServerFrame({ type: "message", message: frame })),
    {
      type: "message",
      message: frame,
    },
  );
  assert.deepEqual(
    plain(
      parseServerFrame(JSON.stringify({ type: "message", message: frame })),
    ),
    {
      type: "message",
      message: frame,
    },
  );
  assert.equal(
    parseServerFrame({ type: "message", message: { id: "m1" } }),
    null,
  );
  assert.equal(parseServerFrame({ type: "typing" }), null);
  assert.equal(parseServerFrame("{not json"), null);
  assert.equal(parseServerFrame(null), null);
  assert.deepEqual(
    plain(
      parseServerFrame({ type: "error", code: "forbidden", message: "No." }),
    ),
    { type: "error", code: "forbidden", message: "No." },
  );
});

test("the inbox opens each conversation and the thread leads back", () => {
  // The thread is only reachable through the inbox (web#19), so the two screens
  // have to agree on the route even though they live on separate branches.
  const inbox = readFileSync(
    new URL("../app/attendee/inbox/inbox-list.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    inbox,
    /href=\{`\/attendee\/inbox\/\$\{conversation\.id\}`\}/,
    "a conversation card links to its thread",
  );

  const thread = readFileSync(
    new URL("../components/messaging/conversation-thread.tsx", import.meta.url),
    "utf8",
  );
  assert.match(
    thread,
    /href="\/attendee\/inbox"/,
    "the thread links back to the inbox",
  );
});

test("reconnect waits back off and stop retrying a rejected session", () => {
  assert.equal(reconnectDelay(0), 1000);
  assert.equal(reconnectDelay(1), 2000);
  assert.equal(reconnectDelay(2), 4000);
  assert.equal(reconnectDelay(9), 15_000);
  assert.equal(reconnectDelay(-3), 1000);

  assert.equal(shouldReconnect(1006), true);
  assert.equal(shouldReconnect(1000), false, "we closed it");
  assert.equal(shouldReconnect(4401), false, "rejected session");
  assert.equal(shouldReconnect(4403), false, "forbidden conversation");
});
