import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToReadableStream } from "react-dom/server";

const require = createRequire(import.meta.url);
function compile(relativePath, dependencies = {}) {
  const source = readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const loaded = { exports: {} };
  const execute = vm.runInNewContext(
    `(function(require,module,exports){${compiled}\n})`,
    { AbortSignal, Intl, Date },
  );
  execute(
    (name) => (name in dependencies ? dependencies[name] : require(name)),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}
const element = (tag) =>
  function TestElement({ children, ...props }) {
    return React.createElement(tag, props, children);
  };
const ui = {
  Card: element("section"),
  Badge: ({ children }) => React.createElement("span", null, children),
  ButtonLink: element("a"),
  Skeleton: ({ className }) =>
    React.createElement("div", { className, "aria-hidden": true }),
  EmptyState: ({ title, children, action }) =>
    React.createElement(
      "div",
      null,
      React.createElement("h2", null, title),
      children,
      action,
    ),
};
const registrationView = compile(
  "../components/organizer/registration-trend.tsx",
);
function dashboardHarness({ events = [], points = [], failure = false } = {}) {
  const requests = [];
  const data = compile("../lib/organizer-dashboard.ts", {
    "server-only": {},
    "./api/server": {
      serverApi: async () => ({
        GET: async (path, options) => {
          requests.push({ path, options });
          if (failure)
            throw new Error("Private upstream implementation detail");
          return {
            response: { ok: true },
            data: path === "/organizer/events" ? { items: events } : { points },
          };
        },
      }),
    },
  });
  const dashboard = compile("../components/organizer/dashboard.tsx", {
    "@/components/ui": ui,
    "@/lib/organizer-dashboard": data,
    "./registration-trend": registrationView,
    "./retry-dashboard": {
      RetryDashboard: () => React.createElement("button", null, "Try again"),
    },
    "next/link": { default: element("a"), __esModule: true },
  });
  return { data, dashboard, requests };
}
async function html(element) {
  const stream = await renderToReadableStream(element);
  await stream.allReady;
  return new Response(stream).text();
}

test("dashboard shows real event totals, all statuses and accessible trend values without contacts", async () => {
  const fixture = ["draft", "published", "ended"].map((status, index) => ({
    id: `event-${index}`,
    name: `${status} gathering`,
    status,
    registrations: index + 1,
    starts_at: null,
    private_contact: "hidden@example.test",
  }));
  const harness = dashboardHarness({
    events: fixture,
    points: [
      { date: "2026-10-15", registrations: 2 },
      { date: "2026-10-16", registrations: 4 },
    ],
  });
  const rendered = await html(await harness.dashboard.OrganizerDashboard());
  for (const label of [
    "Draft",
    "Published",
    "Ended",
    "Total registrations",
    "2026-10-15: 2",
    "2026-10-16: 4",
    "not verified attendance",
  ])
    assert.ok(rendered.includes(label), label);
  assert.match(rendered, />6<\/dd>/);
  assert.ok(!rendered.includes("hidden@example.test"));
  assert.ok(rendered.includes("/organizer/events/event-0/edit"));
  assert.ok(rendered.includes("/organizer/events/event-1"));
  assert.equal(
    harness.requests.filter((request) =>
      request.path.includes("registrations/trend"),
    ).length,
    3,
  );
});

test("empty and failed requests remain distinct, without fabricated zero totals on failure", async () => {
  const empty = dashboardHarness();
  const emptyHtml = await html(await empty.dashboard.OrganizerDashboard());
  assert.ok(emptyHtml.includes("Create your first event"));
  assert.ok(emptyHtml.includes("/organizer/events/new"));
  assert.equal(empty.requests.length, 1);
  const failure = dashboardHarness({ failure: true });
  const failureHtml = await html(await failure.dashboard.OrganizerDashboard());
  assert.ok(failureHtml.includes("could not be loaded"));
  assert.ok(failureHtml.includes("Try again"));
  assert.ok(!failureHtml.includes("Total registrations"));
  assert.ok(!failureHtml.includes("Private upstream"));
});

test("trend endpoint is owner-scoped by event id and request timeout is present", async () => {
  const harness = dashboardHarness();
  await harness.data.loadRegistrationTrend("owned-event");
  assert.equal(harness.requests[0].options.params.path.eventId, "owned-event");
  assert.ok(harness.requests[0].options.signal instanceof AbortSignal);
});

test("flat zero, empty and single-point charts remain readable without invalid coordinates", async () => {
  for (const points of [
    [],
    [{ date: "2026-10-16", registrations: 0 }],
    [
      { date: "2026-10-15", registrations: 0 },
      { date: "2026-10-16", registrations: 0 },
    ],
  ]) {
    const rendered = await html(
      React.createElement(registrationView.RegistrationTrend, { points }),
    );
    assert.ok(!rendered.includes("NaN"));
    assert.ok(!rendered.includes("Infinity"));
    assert.ok(
      rendered.includes(
        points.length ? "Daily registrations" : "No daily registrations",
      ),
    );
  }
});

test("organizer page calls the account guard before rendering dashboard and unavailable accounts never query events", async () => {
  for (const scenario of [
    "attendee",
    "signed-out",
    "unavailable",
    "organizer",
  ]) {
    let dashboardCalls = 0;
    const page = compile("../app/organizer/page.tsx", {
      "@/lib/session": {
        requireAccount: async (type) => {
          assert.equal(type, "organizer");
          if (scenario === "attendee" || scenario === "signed-out")
            throw new Error(`redirect:${scenario}`);
          return scenario === "unavailable"
            ? { unavailable: true }
            : { account: { full_name: "Test Host" } };
        },
      },
      "@/components/auth/workspace": {
        WorkspaceShell: element("main"),
        WorkspaceUnavailable: () =>
          React.createElement("p", null, "Unavailable"),
      },
      "@/components/ui": ui,
      "@/components/organizer/dashboard": {
        DashboardLoading: () => null,
        OrganizerDashboard: () => {
          dashboardCalls++;
          return React.createElement("p", null, "Dashboard");
        },
      },
    });
    if (scenario === "attendee" || scenario === "signed-out")
      await assert.rejects(page.default(), /redirect:/);
    else {
      const rendered = await html(await page.default());
      assert.ok(
        rendered.includes(
          scenario === "organizer" ? "Free demo access" : "Unavailable",
        ),
      );
    }
    assert.equal(dashboardCalls, scenario === "organizer" ? 1 : 0);
  }
});
