import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function compile(file, dependencies = {}) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${javascript}\n})`)(
    (name) => dependencies[name] ?? require(name),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}

const { discoverFilters, matchesFilters } = compile(
  "../components/events/discover-events.tsx",
  {
    "@/components/ui": {},
    "@/lib/api/server": {},
    "@/lib/routes": {},
    "next/link": {},
    "lucide-react": {},
    "@/lib/event-form": { eventCategories: ["Technology", "Music"] },
  },
);

test("discover filters accept only known values from the address", () => {
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(
        discoverFilters({
          category: "Technology",
          format: "virtual",
          open: "1",
        }),
      ),
    ),
    { category: "Technology", format: "virtual", openOnly: true },
  );
  const junk = discoverFilters({
    category: "<script>",
    format: "teleport",
    open: "yes",
  });
  assert.equal(junk.category, undefined);
  assert.equal(junk.format, undefined);
  assert.equal(junk.openOnly, false);
});

test("an event shows only when it matches every chosen filter", () => {
  const event = {
    category: "Technology",
    format: "physical",
    registration_state: "open",
  };
  assert.ok(matchesFilters(event, {}));
  assert.ok(matchesFilters(event, { category: "Technology", openOnly: true }));
  assert.ok(!matchesFilters(event, { category: "Music" }));
  assert.ok(!matchesFilters(event, { format: "virtual" }));
  assert.ok(
    !matchesFilters(
      { ...event, registration_state: "closed" },
      { openOnly: true },
    ),
  );
});
