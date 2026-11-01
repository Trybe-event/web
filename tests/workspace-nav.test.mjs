import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToReadableStream } from "react-dom/server";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

export async function renderNavigation(networkingClosed = false) {
  const javascript = ts.transpileModule(
    fs.readFileSync(
      new URL("../components/events/workspace-nav.tsx", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const loaded = { exports: {} };
  const dependencies = {
    "next/navigation": { usePathname: () => "/attendee/connections" },
    "next/link": {
      default: (props) => React.createElement("a", props),
      __esModule: true,
    },
  };
  vm.runInNewContext(`(function(require,module,exports){${javascript}\n})`)(
    (name) => dependencies[name] ?? require(name),
    loaded,
    loaded.exports,
  );
  const stream = await renderToReadableStream(
    React.createElement(loaded.exports.EventWorkspaceNavigation, {
      slug: "community",
      networkingClosed,
    }),
  );
  await stream.allReady;
  return new Response(stream).text();
}

test("event navigation opens implemented connections and stays at the top on mobile", async () => {
  const html = await renderNavigation();
  assert.match(html, /href="\/attendee\/connections"/);
  assert.match(html, /aria-current="page"/);
  assert.match(html, /sticky top-0/);
  assert.doesNotMatch(
    html,
    /fixed inset-x-0 bottom-0|Connections, not available yet/,
  );
});

test("closed networking replaces discovery with archive but preserves account connections and inbox", async () => {
  const html = await renderNavigation(true);
  assert.match(html, /href="\/events\/community\/archive"/);
  assert.match(html, /href="\/attendee\/connections"/);
  assert.match(html, /href="\/attendee\/inbox"/);
  assert.doesNotMatch(
    html,
    /href="\/events\/community"|href="\/events\/community\/attendees"|not available yet/,
  );
  assert.match(html, /sticky top-0/);
});
