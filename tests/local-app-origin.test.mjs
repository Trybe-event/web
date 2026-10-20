import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
const compiled = ts.transpileModule(
  readFileSync(new URL("../lib/local-app-origin.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const loaded = { exports: {} };
vm.runInNewContext(`(function(module,exports){${compiled}\n})`, { URL, Set })(
  loaded,
  loaded.exports,
);
const { localAppRedirect } = loaded.exports;
const redirect = (
  url,
  method = "GET",
  app = "http://localhost:3000",
  environment = "development",
) => localAppRedirect(url, method, app, environment);
test("local page aliases preserve path and query on the configured origin", () => {
  assert.equal(
    redirect("http://127.0.0.1:3000/organizer?next=%2Fevents"),
    "http://localhost:3000/organizer?next=%2Fevents",
  );
  assert.equal(
    redirect("http://localhost:3000/attendee", "HEAD", "http://127.0.0.1:3000"),
    "http://127.0.0.1:3000/attendee",
  );
});
test("origin correction never redirects writes, API calls, production or unrelated hosts", () => {
  for (const path of ["/api/me/account", "/trpc/test", "/_next/test"])
    assert.equal(redirect(`http://127.0.0.1:3000${path}`), null);
  assert.equal(redirect("http://127.0.0.1:3000/organizer", "POST"), null);
  assert.equal(
    redirect(
      "http://127.0.0.1:3000/organizer",
      "GET",
      "http://localhost:3000",
      "production",
    ),
    null,
  );
  for (const url of [
    "http://localhost:3000/organizer",
    "http://example.com:3000/organizer",
    "http://127.0.0.1:3001/organizer",
    "https://127.0.0.1:3000/organizer",
  ])
    assert.equal(redirect(url), null);
  assert.equal(redirect("http://127.0.0.1:3000/", "GET", ""), null);
  assert.equal(redirect("http://127.0.0.1:3000/", "GET", "bad-url"), null);
});
