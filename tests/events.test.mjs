import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Values built inside the vm context have that context's prototypes, so compare plain
// copies of them rather than the objects themselves.
const plain = (value) => structuredClone(value);

// Run the real lib/events.ts against a stubbed API client, so the rules about what the
// browser may do to an event membership are tested without a running server.
function eventsHarness({
  respond = () => ({ data: undefined, response: { status: 200 } }),
} = {}) {
  const source = readFileSync(
    new URL("../lib/events.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const calls = [];
  const dependencies = {
    "server-only": {},
    "./api/server": {
      serverApi: async () => ({
        GET: async (path, request) => {
          calls.push({ method: "GET", path, request });
          return respond(path, request);
        },
        POST: async (path, request) => {
          calls.push({ method: "POST", path, request });
          return respond(path, request);
        },
      }),
    },
  };
  const compiledModule = { exports: {} };
  const execute = vm.runInNewContext(
    `(function(require,module,exports){${compiled}\n})`,
    { process: { env: { NODE_ENV: "production" } }, AbortSignal },
  );
  execute(
    (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    compiledModule,
    compiledModule.exports,
  );
  return { events: compiledModule.exports, calls };
}

const profileView = { attendee_id: "a1", full_name: "Ada", role: "Engineer" };
const membership = (slug, status = "active") => ({
  event: { id: "e1", slug, name: "Atlas Summit" },
  membership: { event_id: "e1", status, joined_at: "2026-01-01T00:00:00Z" },
});

test("reading an event link never registers anyone", async () => {
  // web#8: opening the link alone must not create a membership. Every helper the
  // landing page calls is a read; the only write lives behind the confirm button.
  const harness = eventsHarness({
    respond: () => ({
      data: {
        already_member: false,
        as_event_member: profileView,
        profile: { ...profileView, links: [] },
      },
      response: { status: 200 },
    }),
  });
  await harness.events.getPublicEvent("atlas-summit");
  await harness.events.hasEventMembership("atlas-summit");
  await harness.events.getJoinPreview("atlas-summit");

  assert.ok(harness.calls.length >= 3, "the helpers read from the API");
  for (const call of harness.calls) {
    assert.equal(call.method, "GET", `${call.path} must be a read`);
  }
  assert.deepEqual(harness.calls.map((call) => call.path).sort(), [
    "/e/{slug}",
    "/e/{slug}/join-preview",
    "/me/events",
  ]);
});

test("the review exposes only the event-member view, never the owner's copy", async () => {
  const harness = eventsHarness({
    respond: () => ({
      data: {
        already_member: true,
        as_event_member: profileView,
        profile: { ...profileView, phone: "+2340000000", links: [] },
      },
      response: { status: 200 },
    }),
  });
  const result = await harness.events.getJoinPreview("atlas-summit");
  assert.equal(result.kind, "review");
  assert.equal(result.preview.alreadyMember, true);
  assert.deepEqual(plain(result.preview.asEventMember), profileView);
  assert.equal(
    "phone" in result.preview.asEventMember,
    false,
    "a private phone number is not part of what event members receive",
  );
});

test("each join-preview reason maps to its own screen state", async () => {
  const cases = [
    [{ data: undefined, response: { status: 404 } }, "needs_profile"],
    [{ data: undefined, response: { status: 403 } }, "not_attendee"],
    [{ data: undefined, response: { status: 401 } }, "not_attendee"],
    [{ data: undefined, response: { status: 500 } }, "unavailable"],
    [new Error("Network unavailable"), "unavailable"],
  ];
  for (const [reply, expected] of cases) {
    const harness = eventsHarness({
      respond: () => {
        if (reply instanceof Error) throw reply;
        return reply;
      },
    });
    const result = await harness.events.getJoinPreview("atlas-summit");
    assert.equal(result.kind, expected);
    assert.equal(
      "preview" in result,
      false,
      "no profile data is handed on when there is no review",
    );
  }
});

test("the switcher lists active memberships only", async () => {
  const harness = eventsHarness({
    respond: () => ({
      data: {
        items: [
          membership("atlas-summit"),
          membership("harbour-meetup", "left"),
          membership("removed-event", "removed"),
          {
            event: { id: "e9", slug: null, name: "Draft" },
            membership: {
              event_id: "e9",
              status: "active",
              joined_at: "2026-01-01T00:00:00Z",
            },
          },
        ],
      },
      response: { status: 200 },
    }),
  });
  assert.deepEqual(plain(await harness.events.listMyEvents()), [
    { slug: "atlas-summit", name: "Atlas Summit" },
  ]);
});

test("an unreachable API yields the safe empty answers", async () => {
  const harness = eventsHarness({
    respond: () => {
      throw new Error("Network unavailable");
    },
  });
  assert.deepEqual(plain(await harness.events.listMyEvents()), []);
  assert.equal(await harness.events.hasEventMembership("atlas-summit"), false);
  assert.deepEqual(plain(await harness.events.getPublicEvent("atlas-summit")), {
    kind: "unavailable",
  });
  assert.deepEqual(plain(await harness.events.getJoinPreview("atlas-summit")), {
    kind: "unavailable",
  });
});

test("an unknown event is a 404 while an upstream failure is not", async () => {
  const missing = eventsHarness({
    respond: () => ({ data: undefined, response: { status: 404 } }),
  });
  assert.deepEqual(plain(await missing.events.getPublicEvent("atlas-summit")), {
    kind: "not_found",
  });

  const broken = eventsHarness({
    respond: () => ({ data: undefined, response: { status: 503 } }),
  });
  assert.deepEqual(plain(await broken.events.getPublicEvent("atlas-summit")), {
    kind: "unavailable",
  });

  const found = eventsHarness({
    respond: () => ({
      data: { id: "e1", slug: "atlas-summit", name: "Atlas Summit" },
      response: { status: 200 },
    }),
  });
  const result = await found.events.getPublicEvent("atlas-summit");
  assert.equal(result.kind, "found");
  assert.equal(result.event.name, "Atlas Summit");
});
