import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../lib/event-scope.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const loaded = { exports: {} };
vm.runInNewContext(`(function(module,exports){${javascript}\n})`, { Set })(
  loaded,
  loaded.exports,
);
const { scopedPaths, requestsAt, connectionsAt, conversationsAt } =
  loaded.exports;

const scope = { eventId: "e1", slug: "devfest" };

test("inside an event every screen stays in the event frame", () => {
  const paths = scopedPaths(scope);
  assert.equal(paths.connections, "/events/devfest/connections");
  assert.equal(paths.inbox, "/events/devfest/messages");
  assert.equal(paths.conversation("c 1"), "/events/devfest/messages/c%201");
  assert.equal(paths.profile, "/events/devfest/profile");
  assert.equal(scopedPaths().inbox, "/attendee/inbox");
  assert.equal(scopedPaths().conversation("c1"), "/attendee/inbox/c1");
});

test("only this event's requests, connections and conversations show", () => {
  const requests = [
    { id: "r1", event_id: "e1" },
    { id: "r2", event_id: "e2" },
  ];
  const connections = [
    { id: "k1", origin_event_id: "e1" },
    { id: "k2", origin_event_id: "e2" },
  ];
  const conversations = [
    { id: "c1", connection_id: "k1" },
    { id: "c2", connection_id: "k2" },
    { id: "c3", connection_id: "gone" },
  ];
  assert.deepEqual(
    requestsAt(requests, scope).map((r) => r.id),
    ["r1"],
  );
  assert.deepEqual(
    connectionsAt(connections, scope).map((c) => c.id),
    ["k1"],
  );
  assert.deepEqual(
    conversationsAt(conversations, connections, scope).map((c) => c.id),
    ["c1"],
  );
  // Without a scope nothing is filtered.
  assert.equal(requestsAt(requests).length, 2);
  assert.equal(conversationsAt(conversations, connections).length, 3);
});
