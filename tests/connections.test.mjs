// Unit tests for the connections rules (web#14), run with node --test. The pure
// module lib/connections.ts holds the rules the acceptance criteria care about:
// which list an action changes, how a failed optimistic removal rolls back, when
// a conflict means "show the server's state", and which profile fields a card may
// show. Its only import is type-only, so it needs no dependencies once compiled.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function connectionsModule() {
  const source = readFileSync(
    new URL("../lib/connections.ts", import.meta.url),
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
  CONFLICT_NOTICE,
  TAB_EMPTY,
  TAB_ORDER,
  actionFailureMessage,
  actionLabel,
  actionList,
  actionSuccessMessage,
  conflict,
  connectedLabel,
  eventSlugs,
  indexOfId,
  insertAt,
  orderedConnections,
  orderedRequests,
  pendingOnly,
  profileHref,
  refetchAfter,
  removeById,
  requestedLabel,
  retryable,
  sharedProfile,
  subtitleOf,
  tabId,
  tabLabel,
  tabPanelId,
} = connectionsModule();

const request = (id, overrides = {}) => ({
  id,
  event_id: "event-1",
  status: "pending",
  message: null,
  direction: "incoming",
  other: { attendee_id: `attendee-${id}`, full_name: `Person ${id}` },
  created_at: "2026-10-16T10:00:00Z",
  ...overrides,
});

const connection = (id, connectedAt) => ({
  id,
  origin_event_id: "event-1",
  connected_at: connectedAt,
  other: { attendee_id: `attendee-${id}`, full_name: `Person ${id}` },
});

test("each action touches the list that owns it", () => {
  assert.equal(actionList("accept"), "incoming");
  assert.equal(actionList("reject"), "incoming");
  assert.equal(actionList("cancel"), "outgoing");

  // A rejection answers a request someone sent you, so it must never be applied
  // to the outgoing list (the defect PR #63 was closed for).
  const incoming = [request("r1")];
  const outgoing = [request("r2", { direction: "outgoing" })];
  const afterReject = {
    incoming: removeById(incoming, "r1"),
    outgoing,
  };
  assert.deepEqual(
    plain(afterReject).incoming,
    [],
    "the rejected request leaves incoming",
  );
  assert.equal(afterReject.outgoing.length, 1, "outgoing is untouched");
  assert.equal(actionLabel("reject"), "Reject");
  assert.equal(actionLabel("cancel"), "Cancel request");
});

test("only pending requests are actionable and newest comes first", () => {
  const items = [
    request("r1", { created_at: "2026-10-15T09:00:00Z" }),
    request("r2", { created_at: "2026-10-16T09:00:00Z" }),
    request("r3", { status: "accepted", created_at: "2026-10-17T09:00:00Z" }),
    request("r4", { status: "cancelled", created_at: "2026-10-14T09:00:00Z" }),
  ];
  assert.deepEqual(
    plain(pendingOnly(items)).map((item) => item.id),
    ["r1", "r2"],
  );
  assert.deepEqual(
    plain(orderedRequests(pendingOnly(items))).map((item) => item.id),
    ["r2", "r1"],
    "newest request first",
  );
  // The same timestamp keeps a stable order rather than shuffling between renders.
  const tied = orderedRequests([
    request("ra", { created_at: "2026-10-16T09:00:00Z" }),
    request("rb", { created_at: "2026-10-16T09:00:00Z" }),
  ]);
  assert.deepEqual(
    plain(tied).map((item) => item.id),
    ["rb", "ra"],
  );
});

test("a failed action puts the row back exactly where it was", () => {
  const before = [
    request("r1", { created_at: "2026-10-16T09:00:00Z" }),
    request("r2", { created_at: "2026-10-15T09:00:00Z" }),
    request("r3", { created_at: "2026-10-14T09:00:00Z" }),
  ];
  const index = indexOfId(before, "r2");
  const optimistic = removeById(before, "r2");
  assert.deepEqual(
    plain(optimistic).map((item) => item.id),
    ["r1", "r3"],
  );

  const rolledBack = insertAt(optimistic, index, before[index]);
  assert.deepEqual(
    plain(rolledBack).map((item) => item.id),
    ["r1", "r2", "r3"],
    "the rollback restores the original order",
  );
});

test("an index that no longer fits appends instead of dropping the row", () => {
  const items = [request("r1")];
  assert.equal(insertAt(items, 5, request("r2")).length, 2);
  assert.equal(insertAt(items, -1, request("r3")).length, 2);
  assert.equal(indexOfId(items, "missing"), -1);
});

test("accepted connections are ordered newest first", () => {
  const ordered = orderedConnections([
    connection("c1", "2026-10-14T11:00:00Z"),
    connection("c2", "2026-10-16T11:00:00Z"),
  ]);
  assert.deepEqual(
    plain(ordered).map((item) => item.id),
    ["c2", "c1"],
  );
});

test("conflicts are recognised from the status or the contract code", () => {
  assert.equal(conflict({ code: "conflict" }), true);
  assert.equal(conflict(null, 409), true);
  assert.equal(conflict({ code: "forbidden" }, 403), false);
  assert.equal(conflict(null, undefined), false);

  // Retrying only makes sense when the request never landed or the server faulted.
  assert.equal(
    retryable(undefined),
    true,
    "the request never reached the server",
  );
  assert.equal(retryable(500), true);
  assert.equal(retryable(503), true);
  assert.equal(retryable(409), false, "someone else already decided");
  assert.equal(retryable(403), false);
  assert.equal(retryable(404), false);
});

test("a failure message names the action, or explains a conflict", () => {
  assert.equal(
    actionFailureMessage("accept", { message: "Networking is closed." }, 409),
    "Networking is closed.",
    "the API's own words win",
  );
  assert.equal(actionFailureMessage("reject", null, 409), CONFLICT_NOTICE);
  assert.equal(
    actionFailureMessage("cancel", null, undefined),
    "Cancel request didn't go through. Try again.",
  );
  assert.equal(
    actionFailureMessage("accept", null, 500),
    "Accept didn't go through. Try again.",
  );
});

test("an acceptance is taken from the accepted list, never fabricated", () => {
  assert.deepEqual(plain(refetchAfter("accept")), ["requests", "connections"]);
  assert.deepEqual(plain(refetchAfter("reject")), ["requests"]);
  assert.deepEqual(plain(refetchAfter("cancel")), ["requests"]);
  assert.equal(
    actionSuccessMessage("accept", "Tomi Ade"),
    "You're connected with Tomi Ade.",
  );
  assert.equal(
    actionSuccessMessage("reject", "Tomi Ade"),
    "You declined Tomi Ade's request.",
  );
  assert.equal(
    actionSuccessMessage("cancel", "Ada Nwosu"),
    "Your request to Ada Nwosu was withdrawn.",
  );
});

test("a connection card shows only the fields a connection may see", () => {
  const profile = {
    attendee_id: "attendee-1",
    full_name: "Tomi Ade",
    role: "Product Engineer",
    organization: "Trybe",
    photo_url: "https://example.test/photo.jpg",
    // Everything below is a wider view than a connection card may render.
    bio: "Long story",
    goals: "Meet builders",
    skills: ["go"],
    interests: ["product"],
    links: [{ kind: "linkedin", value: "https://example.test/in/tomi" }],
    accepting_requests: true,
    relationship: "connected",
  };
  const shown = plain(sharedProfile(profile));
  assert.deepEqual(Object.keys(shown).sort(), [
    "attendee_id",
    "full_name",
    "organization",
    "photo_url",
    "role",
  ]);
  assert.equal(shown.bio, undefined);
  assert.equal(shown.links, undefined);

  // A field the API didn't send stays out of the card rather than rendering empty.
  const sparse = plain(sharedProfile({ attendee_id: "a2", full_name: "Ada" }));
  assert.deepEqual(Object.keys(sparse).sort(), ["attendee_id", "full_name"]);
});

test("the subtitle joins role and organization, or omits what is missing", () => {
  assert.equal(
    subtitleOf({
      attendee_id: "a",
      full_name: "T",
      role: "Designer",
      organization: "Trybe",
    }),
    "Designer · Trybe",
  );
  assert.equal(
    subtitleOf({ attendee_id: "a", full_name: "T", role: "Designer" }),
    "Designer",
  );
  assert.equal(subtitleOf({ attendee_id: "a", full_name: "T" }), null);
});

test("a profile link needs its event slug, and is absent without one", () => {
  const slugs = eventSlugs([
    { event: { id: "event-1", slug: "atlas-summit" } },
    { event: { id: "event-2", slug: "harbour meetup" } },
  ]);
  assert.equal(slugs.get("event-1"), "atlas-summit");
  assert.equal(
    profileHref(slugs.get("event-1"), "attendee-1"),
    "/events/atlas-summit/attendees/attendee-1",
  );
  // No slug means no link: the card never points at a path it can't build.
  assert.equal(profileHref(slugs.get("event-9"), "attendee-1"), null);
  assert.equal(
    profileHref(slugs.get("event-2"), "attendee-1"),
    "/events/harbour%20meetup/attendees/attendee-1",
    "both segments are encoded",
  );
});

test("tabs carry their own ids and counts", () => {
  assert.deepEqual(plain(TAB_ORDER), ["incoming", "outgoing", "connected"]);
  assert.equal(tabLabel("incoming", 2), "Incoming (2)");
  assert.equal(tabLabel("connected", 0), "Connected (0)");
  const ids = TAB_ORDER.map(tabId);
  assert.equal(new Set(ids).size, ids.length, "each tab id is unique");
  for (const tab of TAB_ORDER) {
    assert.notEqual(tabId(tab), tabPanelId(tab), `${tab} wires its panel`);
    assert.ok(TAB_EMPTY[tab].title && TAB_EMPTY[tab].body);
  }
});

test("both dates read as labels, and an unparseable one as nothing", () => {
  assert.match(connectedLabel("2026-10-14T11:00:00Z"), /^Connected /);
  assert.match(requestedLabel("2026-10-14T11:00:00Z"), /^Asked /);
  assert.equal(connectedLabel("not-a-date"), "");
  assert.equal(requestedLabel("not-a-date"), "");
});

test("disconnect sends one request and accept refreshes the server lists", () => {
  // Regression guard for the two defects that closed PR #63: the connected card
  // both called a disconnect handler and sent its own DELETE, and the accept path
  // built a connection locally instead of reloading the API-issued one.
  const files = [
    "../app/attendee/connections/connections-tabs.tsx",
    "../app/attendee/connections/page.tsx",
  ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));
  const deletes = files
    .join("\n")
    .match(/api\.DELETE\("\/connections\/\{connectionId\}"/g);
  assert.equal(deletes?.length, 1, "exactly one DELETE of a connection");
  assert.match(
    files[0],
    /refetchAfter\(action\)\.includes\("connections"\)/,
    "an acceptance refetches GET /me/connections",
  );
  assert.doesNotMatch(
    files[0],
    /origin_event_id: /,
    "no connection is built on the client",
  );
});
