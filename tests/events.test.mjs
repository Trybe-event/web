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

const membership = (slug, status = "active") => ({
  event: { id: "e1", slug, name: "Atlas Summit" },
  membership: { event_id: "e1", status, joined_at: "2026-01-01T00:00:00Z" },
});

test("the switcher lists active memberships only", async () => {
  // web#9: only active events appear in the switcher. Left, removed and
  // slug-less memberships are filtered out, so leaving an event removes it
  // from the switcher immediately.
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

test("an unreachable API yields the safe empty list for the switcher", async () => {
  const harness = eventsHarness({
    respond: () => {
      throw new Error("Network unavailable");
    },
  });
  assert.deepEqual(plain(await harness.events.listMyEvents()), []);
});

test("isEventMember reports already-in, not-in and unknown separately", async () => {
  const inEvent = eventsHarness({
    respond: () => ({
      data: { already_member: true },
      response: { status: 200 },
    }),
  });
  assert.equal(await inEvent.events.isEventMember("atlas-summit"), true);

  const notInEvent = eventsHarness({
    respond: () => ({
      data: { already_member: false },
      response: { status: 200 },
    }),
  });
  assert.equal(await notInEvent.events.isEventMember("atlas-summit"), false);

  const unknown = eventsHarness({
    respond: () => ({ data: undefined, response: { status: 404 } }),
  });
  assert.equal(
    await unknown.events.isEventMember("atlas-summit"),
    null,
    "a 404 means the API couldn't say, not that the attendee is out",
  );
});

test("isEventMember treats an unreachable API as unknown", async () => {
  const harness = eventsHarness({
    respond: () => {
      throw new Error("Network unavailable");
    },
  });
  assert.equal(
    await harness.events.isEventMember("atlas-summit"),
    null,
    "a network failure reads as unknown so the caller can still offer the join",
  );
});
