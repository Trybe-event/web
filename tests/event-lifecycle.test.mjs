import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const compiled = ts.transpileModule(
  readFileSync(new URL("../lib/event-lifecycle.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const loaded = { exports: {} };
vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`)(
  createRequire(import.meta.url),
  loaded,
  loaded.exports,
);
const {
  lifecycleStatuses,
  networkingWindowSchema,
  awaitingEnd,
  eventListTab,
  autoEndTime,
} = loaded.exports;
test("ended event can still show open networking independently of closed registration", () => {
  const statuses = lifecycleStatuses({
    status: "ended",
    registration_state: "closed",
    networking_state: "open",
  });
  assert.equal(
    statuses.find((status) => status.label === "Event").value,
    "Ended",
  );
  assert.equal(
    statuses.find((status) => status.label === "Registration").value,
    "Closed",
  );
  assert.equal(
    statuses.find((status) => status.label === "Networking").value,
    "Open",
  );
});
test("missing server window status is unavailable rather than inferred from event status", () => {
  const statuses = lifecycleStatuses({ status: "ended" });
  assert.equal(statuses[1].value, "Unavailable");
  assert.equal(statuses[2].value, "Unavailable");
});
test("networking window rejects missing, reversed or equal boundaries", () => {
  for (const closes_at of ["", "2026-11-01T09:00:00Z", "2026-11-01T10:00:00Z"])
    assert.equal(
      networkingWindowSchema.safeParse({
        opens_at: "2026-11-01T10:00:00Z",
        closes_at,
      }).success,
      false,
    );
  assert.equal(
    networkingWindowSchema.safeParse({
      opens_at: "2026-11-01T10:00:00Z",
      closes_at: "2026-11-02T10:00:00Z",
    }).success,
    true,
  );
});

test("a finished event moves to Past and waits to be ended for 30 minutes", () => {
  const now = Date.parse("2026-11-25T18:10:00Z");
  const finished = { status: "published", ends_at: "2026-11-25T18:00:00Z" };
  const running = { status: "published", ends_at: "2026-11-25T19:00:00Z" };
  assert.equal(awaitingEnd(finished, now), true);
  assert.equal(eventListTab(finished, now), "ended");
  assert.equal(awaitingEnd(running, now), false);
  assert.equal(eventListTab(running, now), "published");
  assert.equal(
    eventListTab({ status: "draft", ends_at: finished.ends_at }, now),
    "draft",
  );
  assert.equal(
    eventListTab({ status: "ended", ends_at: running.ends_at }, now),
    "ended",
  );
  assert.equal(awaitingEnd({ status: "published", ends_at: null }, now), false);
  assert.equal(
    autoEndTime(finished.ends_at).toISOString(),
    "2026-11-25T18:30:00.000Z",
  );
});
