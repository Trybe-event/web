import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function harness(reply) {
  const calls = [];
  const loaded = { exports: {} };
  const javascript = ts.transpileModule(
    fs.readFileSync(
      new URL("../lib/connection-reads.ts", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const client = {
    api: {
      GET: async (path, options) => {
        calls.push({ path, options });
        if (reply instanceof Error) throw reply;
        return reply;
      },
    },
    errorMessage: (error, fallback) => error?.message ?? fallback,
  };
  vm.runInNewContext(`(function(require,module,exports){${javascript}\n})`)(
    () => client,
    loaded,
    loaded.exports,
  );
  return { ...loaded.exports, calls };
}

test("connection and pending-request outages remain failures rather than empty success", async () => {
  for (const reply of [
    new Error("offline"),
    { response: { ok: false, status: 503 } },
    { response: { ok: true } },
  ]) {
    const access = harness(reply);
    for (const result of [
      await access.fetchAcceptedConnections(),
      await access.fetchPendingRequests("incoming"),
    ]) {
      assert.equal(result.items, null);
      assert.match(result.error, /couldn't load/);
    }
  }
});

test("empty confirmed lists are successful and directions go to the reviewed endpoint", async () => {
  const access = harness({ response: { ok: true }, data: { items: [] } });
  for (const direction of ["incoming", "outgoing"]) {
    const result = await access.fetchPendingRequests(direction);
    assert.deepEqual(Array.from(result.items), []);
    assert.equal(result.error, null);
    assert.equal(access.calls.at(-1).path, "/me/connection-requests");
    assert.equal(access.calls.at(-1).options.params.query.direction, direction);
  }
  assert.equal((await access.fetchAcceptedConnections()).error, null);
  assert.equal(access.calls.at(-1).path, "/me/connections");
});
