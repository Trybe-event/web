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
  Select: element("select"),
  Textarea: element("textarea"),
  Switch: ({ label, checked, onChange }) =>
    React.createElement(
      "button",
      {
        role: "switch",
        "aria-label": label,
        "aria-checked": checked,
        onClick: () => onChange(!checked),
      },
      label,
    ),
  Alert: element("output"),
  Field: ({ label, error, children }) =>
    React.createElement("label", null, label, children({ id: label }), error),
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
  vm.runInNewContext(`(function(require,module,exports){${javascript}\n})`, {
    AbortSignal,
  })((name) => dependencies[name] ?? require(name), loaded, loaded.exports);
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
function harness(
  file,
  exportName,
  props,
  pathname = "/organizer",
  dependencies = {},
) {
  const states = [];
  let stateIndex = 0;
  const component = compile(file, {
    react: {
      ...React,
      useRef(initial) {
        const index = stateIndex++;
        if (!(index in states)) states[index] = { current: initial };
        return states[index];
      },
      useState(initial) {
        const index = stateIndex++;
        if (!(index in states)) states[index] = initial;
        return [
          states[index],
          (value) => {
            states[index] =
              typeof value === "function" ? value(states[index]) : value;
          },
        ];
      },
    },
    "next/link": { default: element("a"), __esModule: true },
    "next/navigation": {
      usePathname: () => pathname,
      useRouter: () => ({ refresh() {} }),
    },
    "@/lib/api/client": {},
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
    "@/components/organizer/signed-in-devices": {
      SignedInDevices: () => React.createElement("p", null, "Devices"),
    },
    ...dependencies,
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

const savedAccount = {
  id: "a1",
  type: "organizer",
  full_name: "Alex Host",
  organization: "Gather Studio",
  created_at: "2026-11-01T00:00:00Z",
  business: {
    support_email: "help@gather.ng",
    support_phone: null,
    website: null,
    city: "Lagos",
    country_code: "NG",
    timezone: "Africa/Lagos",
    about: "",
    notify_event_updates: true,
    notify_event_summaries: true,
  },
};

test("settings open on the editable business profile and keep unsupported payments disclosed", () => {
  const view = harness(
    "../components/organizer/workspace-sections.tsx",
    "OrganizerSettings",
    { account: savedAccount },
  );
  const form = view.find((node) => node.type?.name === "BusinessProfileForm");
  assert.equal(form[0]?.props.account.organization, "Gather Studio");
  assert.equal(form[0]?.props.account.full_name, "Alex Host");
  view
    .find(
      (node) =>
        node.type === "button" &&
        node.props.children.includes("Payments & payouts"),
    )[0]
    .props.onClick();
  view.render();
  assert.match(view.html(), /Payments are coming/);
  assert.doesNotMatch(view.html(), /Saved successfully/);
});

function businessForm(result, exportName = "BusinessProfileForm") {
  const calls = { put: [], refresh: 0, saved: [] };
  const view = harness(
    "../components/organizer/workspace-sections.tsx",
    exportName,
    { account: savedAccount, onSaved: (account) => calls.saved.push(account) },
    "/organizer/settings",
    {
      "next/navigation": {
        useRouter: () => ({ refresh: () => calls.refresh++ }),
      },
      "@/lib/api/client": {
        api: {
          PUT: async (path, init) => {
            calls.put.push({ path, body: init.body });
            return result;
          },
        },
        fieldErrors: (error) => error?.fields ?? {},
        errorMessage: (error, fallback = "Something went wrong.") =>
          error?.message ?? fallback,
      },
    },
  );
  const input = (label) =>
    view
      .find((node) => node.props?.label === label)[0]
      .props.children({ id: label });
  return {
    view,
    calls,
    type(label, value) {
      input(label).props.onChange({ target: { value } });
      view.render();
    },
    async submit() {
      view
        .find((node) => node.type === "form")[0]
        .props.onSubmit({ preventDefault() {} });
      await new Promise((resolve) => setImmediate(resolve));
      view.render();
    },
  };
}

test("business profile saves the whole profile and refreshes the workspace", async () => {
  const form = businessForm({
    data: {
      ...savedAccount,
      organization: "New Studio",
      full_name: "Ada Okafor",
    },
    response: { ok: true, status: 200 },
  });
  assert.match(form.view.html(), /value="Gather Studio"/);
  assert.match(form.view.html(), /value="help@gather.ng"/);
  form.type("Business name", " New  Studio ");
  form.type("Contact name", "Ada Okafor");
  form.type("Website", "https://gather.ng");
  await form.submit();
  // The body is built inside the test VM, so compare its JSON across realms.
  assert.deepEqual(JSON.parse(JSON.stringify(form.calls.put)), [
    {
      path: "/me/account",
      body: {
        ...savedAccount.business,
        full_name: "Ada Okafor",
        organization: " New  Studio ",
        website: "https://gather.ng",
      },
    },
  ]);
  assert.equal(form.calls.refresh, 1);
  assert.equal(form.calls.saved.length, 1);
  assert.match(form.view.html(), /value="New Studio"/);
  assert.match(form.view.html(), /Business profile saved/);
});

test("business profile shows API field errors and does not claim a save", async () => {
  const form = businessForm({
    error: { code: "invalid", fields: { organization: "Required." } },
    response: { ok: false, status: 400 },
  });
  form.type("Business name", "");
  await form.submit();
  assert.equal(form.calls.refresh, 0);
  assert.match(form.view.html(), /Required\./);
  assert.match(form.view.html(), /Some fields need attention/);
  assert.doesNotMatch(form.view.html(), /Business profile saved/);
});

test("email switches save with the rest of the profile unchanged", async () => {
  const form = businessForm(
    {
      data: {
        ...savedAccount,
        business: { ...savedAccount.business, notify_event_summaries: false },
      },
      response: { ok: true, status: 200 },
    },
    "NotificationSettings",
  );
  form.view
    .find((node) => node.props?.label === "Event summaries")[0]
    .props.onChange(false);
  form.view.render();
  await form.submit();
  const body = JSON.parse(JSON.stringify(form.calls.put[0].body));
  assert.equal(body.notify_event_summaries, false);
  assert.equal(body.notify_event_updates, true);
  assert.equal(body.support_email, "help@gather.ng");
  assert.equal(body.organization, "Gather Studio");
  assert.match(form.view.html(), /Email preferences saved/);
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
      "@/lib/api/server": {
        serverApi: async () => {
          dataCalls++;
          return { GET: async () => ({ data: { items: [] } }) };
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

test("audience lists registrations by status and approves through the API", async () => {
  const calls = [];
  const rows = [
    {
      id: "r1",
      event_id: "e1",
      event_name: "Hack Day",
      attendee_name: "Tomi",
      status: "pending",
      registered_at: "2026-11-01T09:00:00Z",
      answers: [{ question: "Company", value: ["Acme"] }],
      decided_at: null,
    },
    {
      id: "r2",
      event_id: "e1",
      event_name: "Hack Day",
      attendee_name: "Seyi",
      status: "active",
      registered_at: "2026-11-01T10:00:00Z",
      answers: [],
      decided_at: null,
    },
  ];
  const view = harness(
    "../components/organizer/workspace-sections.tsx",
    "OrganizerAudience",
    { initial: rows },
    "/organizer/audience",
    {
      "@/lib/api/client": {
        api: {
          GET: async () => ({
            response: { ok: true },
            data: {
              items: rows.map((row) =>
                row.id === "r1" ? { ...row, status: "active" } : row,
              ),
            },
          }),
          POST: async (path, init) => {
            calls.push({
              path,
              id: init.params.path.registrationId,
              body: init.body,
            });
            return {
              data: {
                id: "r1",
                event_id: "e1",
                status: "active",
                joined_at: "x",
              },
            };
          },
        },
        errorMessage: () => "failed",
      },
    },
  );
  assert.match(view.html(), /Pending \(1\)/);
  assert.match(view.html(), /Approved \(1\)/);
  assert.doesNotMatch(view.html(), /Approve Seyi/);
  view
    .find((node) => node.props?.["aria-label"] === "Approve Tomi")[0]
    .props.onClick();
  await new Promise((resolve) => setImmediate(resolve));
  view.render();
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    {
      path: "/organizer/registrations/{registrationId}/decision",
      id: "r1",
      body: { decision: "approve" },
    },
  ]);
  assert.match(view.html(), /Approved \(2\)/);
  // Registration answers are shown to the organizer beside the person.
  assert.match(view.html(), /Company:<\/dt> <dd class="inline">Acme<\/dd>/);
});
