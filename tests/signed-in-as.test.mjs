import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Each call loads the module with fetch answering from the given list in order.
function load(answers) {
  const source = readFileSync(
    new URL("../lib/signed-in-as.ts", import.meta.url),
    "utf8",
  );
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const calls = { fetch: 0, refresh: 0 };
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(module,exports){${javascript}\n})`, {
    AbortSignal,
    setTimeout,
    fetch: async () => {
      const answer = answers[Math.min(calls.fetch++, answers.length - 1)];
      if (answer instanceof Error) throw answer;
      return {
        status: answer.status,
        ok: answer.status < 300,
        json: async () => answer.body,
      };
    },
  })(loaded, loaded.exports);
  const check = (type) =>
    loaded.exports.signedInAs(
      type,
      async () => calls.refresh++,
      async () => {},
    );
  return { check, calls };
}

test("an attendee account is refused on the organizer page", async () => {
  const { check } = load([{ status: 200, body: { type: "attendee" } }]);
  assert.equal(await check("organizer"), false);
});

test("a 401 right after sign-in is retried, not taken as allowed", async () => {
  const { check, calls } = load([
    { status: 401 },
    { status: 200, body: { type: "attendee" } },
  ]);
  assert.equal(await check("organizer"), false);
  assert.equal(calls.fetch, 2);
  assert.equal(calls.refresh, 2);
});

test("a session that is never recognised is refused", async () => {
  const { check, calls } = load([{ status: 401 }]);
  assert.equal(await check("organizer"), false);
  assert.equal(calls.fetch, 4);
});

test("the right type, a new sign-in and an outage continue", async () => {
  assert.equal(
    await load([{ status: 200, body: { type: "organizer" } }]).check(
      "organizer",
    ),
    true,
  );
  assert.equal(await load([{ status: 404 }]).check("organizer"), true);
  assert.equal(await load([{ status: 503 }]).check("organizer"), true);
  assert.equal(await load([new Error("offline")]).check("organizer"), true);
});
