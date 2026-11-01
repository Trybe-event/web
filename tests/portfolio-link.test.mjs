import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { renderToStaticMarkup } = require("react-dom/server");
const { createElement } = require("react");
function loadSource(path, dependencies = {}) {
  const loaded = { exports: {} };
  const source = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, {
    URL,
  })((name) => dependencies[name] ?? require(name), loaded, loaded.exports);
  return loaded.exports;
}
const links = loadSource("../lib/connection-action.ts");
const { PortfolioLink } = loadSource("../components/ui/portfolio-link.tsx", {
  "@/lib/connection-action": links,
});
const render = (value) =>
  renderToStaticMarkup(createElement(PortfolioLink, { value }));

test("portfolio card links to the full destination with a concise label and safe new tab", () => {
  const html = render("https://portfolio.example/work?project=trybe");
  assert.match(
    html,
    /href="https:\/\/portfolio\.example\/work\?project=trybe"/,
  );
  assert.match(html, />Portfolio<\/a>/);
  assert.doesNotMatch(html, />portfolio\.example<\/span>/);
  assert.doesNotMatch(html.replace(/href="[^"]*"/, ""), /portfolio\.example/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noopener noreferrer"/);
});

test("unsafe schemes and credential-bearing URLs never become clickable portfolio cards", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,test",
    "https://name:password@portfolio.example",
    "not a website",
  ]) {
    assert.doesNotMatch(render(value), /<a\b/);
  }
});

test("portfolio text is escaped rather than interpreted as markup", () => {
  assert.doesNotMatch(render('<script>alert("test")</script>'), /<script>/);
});
