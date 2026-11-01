import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
// Match the Node runtime initialization supplied by the Next CLI.
require("next/dist/server/node-environment-baseline");
const {
  unstable_doesMiddlewareMatch,
} = require("next/experimental/testing/server");

function loadProxy(environment) {
  let clerkOptions;
  const loadedProxyModule = { exports: {} };
  const dependencies = {
    "@clerk/nextjs/server": {
      clerkMiddleware: (options) => {
        clerkOptions = options;
        return () => undefined;
      },
    },
    "./lib/local-app-origin": { localAppRedirect: () => null },
    "next/server": { NextResponse: {} },
  };
  const compiled = ts.transpileModule(
    readFileSync(new URL("../proxy.ts", import.meta.url), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    },
  ).outputText;
  vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, {
    process: { env: { NODE_ENV: environment } },
  })(
    (name) => dependencies[name],
    loadedProxyModule,
    loadedProxyModule.exports,
  );
  return { config: loadedProxyModule.exports.config, clerkOptions };
}

test("Clerk SDK JavaScript and API requests reach the frontend proxy matcher", () => {
  const { config } = loadProxy("development");
  for (const url of [
    "/__clerk/npm/@clerk/clerk-js@6/dist/clerk.browser.js",
    "/__clerk/v1/environment",
    "/__clerk/v1/client/sign_ins",
  ]) {
    assert.equal(
      unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }),
      true,
    );
  }
});

test("same-origin Clerk proxy is enabled for development without changing production policy", () => {
  assert.equal(
    loadProxy("development").clerkOptions.frontendApiProxy.enabled,
    true,
  );
  assert.equal(
    loadProxy("production").clerkOptions.frontendApiProxy.enabled,
    false,
  );
});
