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
    },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${javascript}\n})`, {
    RegExp,
    Set,
    Headers,
  })((name) => dependencies[name] ?? require(name), loaded, loaded.exports);
  return loaded.exports;
}

const proxy = compile("../lib/proxy.ts", {
  "./api/routes.gen": compile("../lib/api/routes.gen.ts"),
});

test("only the signed unsubscribe write skips the same-origin check", () => {
  assert.deepEqual([...proxy.TOKEN_WRITE_PATHS], ["/email/unsubscribe"]);
  assert.ok(proxy.isAllowed("POST", "/email/unsubscribe"));
  assert.ok(!proxy.isAllowed("GET", "/email/unsubscribe"));
  // Every other write still needs the app's own origin.
  assert.ok(!proxy.isSameOrigin("POST", null, "https://trybe.events"));
  assert.ok(
    !proxy.isSameOrigin("POST", "https://evil.example", "https://trybe.events"),
  );
  assert.ok(
    proxy.isSameOrigin("POST", "https://trybe.events", "https://trybe.events"),
  );
});
