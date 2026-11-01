import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function harness(replies) {
  const calls = [];
  const javascript = ts.transpileModule(
    fs.readFileSync(
      new URL("../lib/messaging/inbox-read.ts", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const dependencies = {
    "../api/client": {
      api: {
        GET: async (path, options) => {
          calls.push({ path, options });
          const reply = replies[path];
          if (reply instanceof Error) throw reply;
          return reply;
        },
      },
      errorMessage: (error, fallback) => error?.message ?? fallback,
    },
    "./inbox": {
      orderedConversations: (items) => items,
      unreadMessages: (totals) => totals.messages,
    },
  };
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${javascript}\n})`)(
    (name) => dependencies[name],
    loaded,
    loaded.exports,
  );
  return { ...loaded.exports, calls };
}

test("inbox failures never masquerade as empty conversations or confirmed unread counts", async () => {
  for (const problem of [
    new Error("offline"),
    { response: { ok: false, status: 503 } },
    { response: { ok: true } },
  ]) {
    for (const path of ["/conversations", "/me/unread"]) {
      const replies = {
        "/conversations": {
          response: { ok: true },
          data: { items: [{ id: "private-thread" }] },
        },
        "/me/unread": { response: { ok: true }, data: { messages: 2 } },
      };
      replies[path] = problem;
      const result = await harness(replies).loadInboxSnapshot();
      assert.equal(result.kind, "unavailable");
      assert.equal("conversations" in result, false);
      assert.equal("unread" in result, false);
    }
  }
});

test("confirmed inbox reads use both authorized endpoints and the cancellation signal", async () => {
  const access = harness({
    "/conversations": { response: { ok: true }, data: { items: [] } },
    "/me/unread": { response: { ok: true }, data: { messages: 0 } },
  });
  const abort = new AbortController();
  const result = await access.loadInboxSnapshot(abort.signal);
  assert.equal(result.kind, "loaded");
  assert.deepEqual(result.conversations, []);
  assert.equal(result.unread, 0);
  assert.equal(access.calls.length, 2);
  assert.ok(access.calls.every((call) => call.options.signal === abort.signal));
});
