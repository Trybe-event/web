import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function clientHarness(configured) {
  let authCalls = 0;
  const dependencies = {
    "server-only": {},
    "../auth-config": { authConfigured: () => configured },
    "@clerk/nextjs/server": {
      auth: async () => {
        authCalls++;
        return { getToken: async () => "session-fixture" };
      },
    },
    "openapi-fetch": { __esModule: true, default: (options) => options },
  };
  const source = ts.transpileModule(
    readFileSync(new URL("../lib/api/server.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, {
    process: {
      env: {
        API_INTERNAL_URL: "http://localhost:8080",
        PROXY_SHARED_SECRET: "proxy-fixture",
      },
    },
  })((name) => dependencies[name], loaded, loaded.exports);
  return { client: loaded.exports.serverApi, authCalls: () => authCalls };
}
test("public API reads remain available without a configured Clerk instance", async () => {
  const harness = clientHarness(false);
  const client = await harness.client();
  assert.equal(harness.authCalls(), 0);
  assert.equal(client.headers.Authorization, undefined);
  assert.equal(client.headers["X-Trybe-Proxy-Secret"], "proxy-fixture");
  assert.equal(client.cache, "no-store");
});
test("configured server requests retain Clerk authentication and proxy credentials", async () => {
  const harness = clientHarness(true);
  const client = await harness.client();
  assert.equal(harness.authCalls(), 1);
  assert.equal(client.headers.Authorization, "Bearer session-fixture");
  assert.equal(client.headers["X-Trybe-Proxy-Secret"], "proxy-fixture");
});
