// The "Have an event link or code?" box (attendee home) accepts a bare code, a
// path or a full invitation link, and nothing that isn't an event slug.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function routesModule() {
  const source = readFileSync(
    new URL("../lib/routes.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  vm.runInNewContext(`(function(module,exports){${compiled}\n})`, { URL })(
    compiledModule,
    compiledModule.exports,
  );
  return compiledModule.exports;
}

const { eventSlugFromInput } = routesModule();

test("codes, paths and invitation links resolve to the event slug", () => {
  for (const input of [
    "7lqrd4",
    "  7LQRD4  ",
    "/7lqrd4",
    "https://trybe-web-staging.vercel.app/7lqrd4",
    "https://trybe.events/7lqrd4?utm_source=whatsapp#top",
    "trybe.events/7lqrd4",
  ])
    assert.equal(eventSlugFromInput(input), "7lqrd4", input);
});

test("anything that isn't one event slug is refused", () => {
  for (const input of [
    "",
    "   ",
    "ab",
    "https://trybe.events/",
    "https://trybe.events/events/7lqrd4",
    "https://trybe.events/attendee",
    "admin",
    "hello world",
    "javascript:alert(1)",
  ])
    assert.equal(eventSlugFromInput(input), null, input);
});
