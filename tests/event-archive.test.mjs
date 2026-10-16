import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function archiveHarness(replies) {
  const compiled = ts.transpileModule(
    readFileSync(new URL("../lib/event-archive.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const loaded = { exports: {} };
  const calls = [];
  const dependencies = {
    "server-only": {},
    "./api/server": {
      serverApi: async () => ({
        GET: async (path, options) => {
          calls.push({ path, options });
          const next = replies.shift();
          if (next instanceof Error) throw next;
          return next;
        },
      }),
    },
  };
  vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, {
    AbortSignal,
  })((name) => dependencies[name], loaded, loaded.exports);
  return { load: loaded.exports.loadEventArchive, calls };
}
test("archive reloads current permissions without retaining an older contact snapshot", async () => {
  const harness = archiveHarness([
    {
      response: { ok: true },
      data: {
        attendees: [
          {
            attendee_id: "one",
            full_name: "One",
            links: [{ kind: "phone", value: "+1234567890" }],
          },
        ],
      },
    },
    {
      response: { ok: true },
      data: { attendees: [{ attendee_id: "one", full_name: "One" }] },
    },
  ]);
  assert.equal((await harness.load("event")).attendees[0].links.length, 1);
  assert.equal("links" in (await harness.load("event")).attendees[0], false);
  assert.equal(harness.calls.length, 2);
  for (const { path, options } of harness.calls) {
    assert.equal(path, "/events/{eventId}/archive");
    assert.equal(options.params.path.eventId, "event");
    assert.equal(options.cache, "no-store");
    assert.ok(options.signal instanceof AbortSignal);
  }
});
test("archive service errors never reuse stale attendee data or expose upstream details", async () => {
  const harness = archiveHarness([
    { response: { ok: false }, error: { message: "private internal detail" } },
    new Error("database detail"),
  ]);
  assert.equal(await harness.load("event"), null);
  assert.equal(await harness.load("event"), null);
});
