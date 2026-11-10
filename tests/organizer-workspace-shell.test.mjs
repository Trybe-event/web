import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const element = (tag) =>
  function TestElement({ children, ...props }) {
    return React.createElement(tag, props, children);
  };
const ui = {
  Logo: () => "trybe.",
  Button: element("button"),
  Card: element("section"),
  Input: element("input"),
  Dialog: ({ open, title, description, children, actions }) =>
    open
      ? React.createElement(
          "section",
          { role: "dialog", "aria-label": title },
          description,
          children,
          actions,
        )
      : null,
};
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
function walk(node, predicate) {
  if (!node || typeof node !== "object") return [];
  return [
    ...(predicate(node) ? [node] : []),
    ...React.Children.toArray(node.props?.children).flatMap((child) =>
      walk(child, predicate),
    ),
  ];
}
function harness(file, exportName, props, pathname = "/organizer") {
  const states = [];
  let stateIndex = 0;
  const component = compile(file, {
    react: {
      ...React,
      useState(initial) {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [
          states[index],
          (value) => {
            states[index] = value;
          },
        ];
      },
    },
    "next/link": { default: element("a"), __esModule: true },
    "next/navigation": { usePathname: () => pathname },
    "@/components/ui": ui,
    "@/components/brand-mark": {
      BrandMark: () =>
        React.createElement("svg", { "aria-label": "Trybe mark" }),
    },
    "@/components/auth/sign-out": {
      SignOut: () => React.createElement("button", null, "Sign out"),
    },
    "@/components/auth/theme-toggle": {
      ThemeToggle: () => React.createElement("button", null, "Choose theme"),
    },
    "@/lib/legal": { legalContact: { email: "trybevent@gmail.com" } },
  })[exportName];
  let tree;
  function render() {
    stateIndex = 0;
    tree = component(props);
    return tree;
  }
  render();
  return {
    render,
    find: (predicate) => walk(tree, predicate),
    html: () => renderToStaticMarkup(tree),
    get tree() {
      return tree;
    },
    click(label) {
      const button = walk(
        tree,
        (node) => node.props?.["aria-label"] === label,
      )[0];
      assert.ok(button, label);
      button.props.onClick();
      render();
    },
  };
}

test("organizer sidebar separates business and owner, collapses independently from mobile navigation, and preserves route content", () => {
  const view = harness(
    "../components/organizer/workspace-shell.tsx",
    "OrganizerWorkspaceShell",
    {
      businessName: "Gather Studio",
      ownerName: "Alex Host",
      children: "Real event dashboard",
    },
  );
  assert.match(view.html(), /Gather Studio/);
  assert.match(view.html(), /Alex Host/);
  assert.match(view.html(), /Business owner/);
  assert.match(view.html(), /Real event dashboard/);
  for (const path of ["audience", "payments", "settings"])
    assert.match(view.html(), new RegExp(`href="/organizer/${path}"`));
  assert.equal(view.tree.props["data-sidebar-collapsed"], false);
  view.click("Collapse sidebar");
  assert.equal(view.tree.props["data-sidebar-collapsed"], true);
  assert.match(view.html(), /Real event dashboard/);
  view.click("Open navigation");
  assert.equal(view.tree.props["data-mobile-navigation-open"], true);
  assert.equal(view.tree.props["data-sidebar-collapsed"], true);
  view.click("Close navigation");
  view.click("Expand sidebar");
  assert.equal(view.tree.props["data-sidebar-collapsed"], false);
  assert.equal(view.tree.props["data-mobile-navigation-open"], false);
});

test("Ask Trybe is in the top-right header, opens a pinned coming-soon dialog and closes cleanly", () => {
  const view = harness(
    "../components/organizer/workspace-shell.tsx",
    "OrganizerWorkspaceShell",
    { businessName: "Gather Studio", ownerName: "Alex Host" },
    "/organizer/settings",
  );
  assert.doesNotMatch(view.html(), /role="dialog"/);
  const header = view.find((node) => node.type === "header")[0];
  assert.match(renderToStaticMarkup(header), /Choose theme/);
  assert.doesNotMatch(
    renderToStaticMarkup(view.find((node) => node.type === "aside")[0]),
    /Appearance|Choose theme/,
  );
  const ask = walk(
    header,
    (node) => node.props?.className === "organizer-ask",
  )[0];
  assert.ok(ask);
  assert.equal(view.find((node) => node.type === "nav").length, 1);
  assert.doesNotMatch(
    renderToStaticMarkup(view.find((node) => node.type === "nav")[0]),
    /AI matching|Ask Trybe/,
  );
  ask.props.onClick();
  view.render();
  assert.match(view.html(), /role="dialog"/);
  assert.match(view.html(), /Coming soon/);
  assert.match(view.html(), /Settings/);
  view.find((node) => node.props?.title === "Ask Trybe")[0].props.onClose();
  view.render();
  assert.doesNotMatch(view.html(), /role="dialog"/);
});

test("event tabs and search filter only the organizer-provided rows without losing draft or past events", () => {
  const items = [
    {
      id: "1",
      name: "Design Day",
      status: "published",
      content: "Published event",
    },
    {
      id: "2",
      name: "Security Meetup",
      status: "draft",
      content: "Draft event",
    },
    {
      id: "3",
      name: "Previous Gathering",
      status: "ended",
      content: "Past event",
    },
  ];
  const view = harness(
    "../components/organizer/event-list.tsx",
    "OrganizerEventList",
    { items },
  );
  const shown = () =>
    view
      .find((node) => node.type === "div" && node.props?.hidden === false)
      .map((node) => node.props.children);
  assert.deepEqual(shown(), ["Published event"]);
  view
    .find(
      (node) => node.type === "button" && node.props.children === "Drafts",
    )[0]
    .props.onClick();
  view.render();
  assert.deepEqual(shown(), ["Draft event"]);
  view
    .find((node) => node.type === "input")[0]
    .props.onChange({ target: { value: "  SECURITY " } });
  view.render();
  assert.deepEqual(shown(), ["Draft event"]);
  view
    .find((node) => node.type === "input")[0]
    .props.onChange({ target: { value: "Design" } });
  view.render();
  assert.deepEqual(shown(), []);
  assert.match(view.html(), /No events found/);
  assert.match(view.html(), /Draft event/);
});

test("settings show saved account details and do not pretend unsupported business edits or payments are saved", () => {
  const view = harness(
    "../components/organizer/workspace-sections.tsx",
    "OrganizerSettings",
    { businessName: "Gather Studio", ownerName: "Alex Host" },
  );
  assert.match(view.html(), /value="Gather Studio"/);
  assert.match(view.html(), /readOnly=""/);
  assert.doesNotMatch(view.html(), /Save changes|Saved successfully/);
  view
    .find(
      (node) =>
        node.type === "button" &&
        node.props.children.includes("Payments & payouts"),
    )[0]
    .props.onClick();
  view.render();
  assert.match(view.html(), /Payments are coming/);
});

test("new organizer sections guard the account before accessing event data or rendering settings", async () => {
  for (const path of ["audience", "payments", "settings", "experiences/new"]) {
    let dataCalls = 0;
    const { default: Page } = compile(`../app/organizer/${path}/page.tsx`, {
      "@/lib/session": {
        requireAccount: async (role) => {
          assert.equal(role, "organizer");
          throw new Error("redirect:wrong-account");
        },
      },
      "@/lib/organizer-dashboard": {
        loadOrganizerEvents: async () => {
          dataCalls++;
          return [];
        },
      },
      "@/components/auth/workspace": {},
      "@/components/organizer/workspace-sections": {},
      "@/components/organizer/event-fields": {},
      "@/components/organizer/event-form": {},
      "@/components/organizer/event-settings": {},
    });
    await assert.rejects(Page(), /redirect:wrong-account/);
    assert.equal(dataCalls, 0);
  }
});

test("owned event changes the sidebar, breadcrumb and selected route without losing business owner controls", () => {
  const root = "/organizer/events/4498a070-f75f-44c8-ab2e-69138d0914b1";
  const view = harness(
    "../components/organizer/workspace-shell.tsx",
    "OrganizerWorkspaceShell",
    {
      businessName: "Gather Studio",
      ownerName: "Alex Host",
      children: "Event-specific content",
      event: {
        id: "4498a070-f75f-44c8-ab2e-69138d0914b1",
        name: "Builders Summit",
        status: "published",
      },
    },
    `${root}/analytics`,
  );
  const nav = renderToStaticMarkup(view.find((node) => node.type === "nav")[0]);
  for (const label of [
    "All events",
    "Overview",
    "Event setup",
    "Attendance",
    "Reach",
    "Analytics",
    "Preview event",
    "Event settings",
  ])
    assert.ok(nav.includes(label), label);
  assert.ok(nav.includes(`href="${root}/analytics"`));
  assert.match(nav, /aria-label="Analytics"[^>]*aria-current="page"/);
  assert.doesNotMatch(nav, /href="\/organizer\/(audience|payments|settings)"/);
  assert.match(view.html(), /Builders Summit/);
  assert.match(view.html(), /Published event/);
  assert.match(view.html(), /Alex Host/);
  view.click("Collapse sidebar");
  assert.match(view.html(), /aria-label="Event setup"/);
  view.click("Open navigation");
  assert.match(view.html(), /Event-specific content/);
});

test("newly saved unnamed drafts get the event workspace and do not masquerade as published", () => {
  const view = harness(
    "../components/organizer/workspace-shell.tsx",
    "OrganizerWorkspaceShell",
    {
      businessName: "Gather Studio",
      ownerName: "Alex Host",
      event: { id: "draft-id", name: "", status: "draft" },
    },
    "/organizer/events/draft-id/edit",
  );
  assert.match(view.html(), /Untitled event/);
  assert.match(view.html(), /Draft event/);
  assert.match(view.html(), /aria-label="Event setup"[^>]*aria-current="page"/);
});
