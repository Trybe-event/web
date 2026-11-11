import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function compile(file, dependencies = {}) {
  const source = ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, {
    AbortSignal,
    Date,
  })(
    (name) => (name in dependencies ? dependencies[name] : require(name)),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}
const navigation = compile("../lib/attendee-navigation.ts");
const eventList = compile("../lib/attendee-event-list.ts");
const anchor = {
  __esModule: true,
  default: ({ children, ...props }) =>
    React.createElement("a", props, children),
};
function shell(pathname, props = {}) {
  const { AttendeeWorkspaceShell } = compile(
    "../components/attendee/workspace-shell.tsx",
    {
      react: { ...React, useState: (initial) => [initial, () => {}] },
      "next/link": anchor,
      "next/navigation": { usePathname: () => pathname },
      "@/lib/attendee-navigation": navigation,
      "@/components/ui": { Logo: () => "trybe." },
      "@/components/brand-mark": { BrandMark: () => "mark" },
      "@/components/auth/sign-out": {
        SignOut: () => React.createElement("button", null, "Sign out"),
      },
      "@/components/auth/theme-toggle": {
        ThemeToggle: () => React.createElement("button", null, "Theme"),
      },
      "@/components/auth/event-switcher": {
        EventSwitcher: () => React.createElement("label", null, "Your events"),
      },
      "@/components/messaging/inbox-badge": {
        InboxBadge: () =>
          React.createElement("a", { href: "/attendee/inbox" }, "Inbox"),
      },
    },
  );
  return renderToStaticMarkup(
    React.createElement(
      AttendeeWorkspaceShell,
      props,
      "Permitted page content",
    ),
  );
}

test("attendee areas map to one shared navigation section, including nested inbox and event routes", () => {
  for (const path of [
    "/attendee/connections",
    "/attendee/requests",
    "/attendee/inbox/conversation",
  ])
    assert.equal(navigation.attendeeSection(path), "network");
  assert.equal(navigation.attendeeSection("/attendee/profile/edit"), "profile");
  assert.equal(
    navigation.attendeeSection("/attendee/notifications/preferences"),
    "profile",
  );
  assert.equal(navigation.attendeeSection("/events/abc123/program"), "events");
  assert.equal(navigation.attendeeSection("/attendee/discover"), "discover");
});

test("desktop and mobile expose Discover, My events, Network and Profile without an organizer role switch", () => {
  const html = shell("/attendee/requests", { accountName: "Alex Attendee" });
  for (const label of ["Discover", "My events", "Network", "Profile"])
    assert.ok(html.includes(label), label);
  assert.match(html, /attendee-mobile-navigation/);
  assert.match(html, /attendee-desktop-navigation/);
  assert.match(html, /href="\/attendee\/connections"[^>]*aria-current="page"/);
  assert.match(html, /Alex Attendee/);
  assert.match(html, /Privacy &amp; visibility/);
  assert.match(html, /Permitted page content/);
  assert.doesNotMatch(html, /href="\/organizer|Switch role/);
});

test("the shell renders only supplied joined events and preserves event context", () => {
  const html = shell("/events/abc123", {
    events: [{ slug: "abc123", name: "Builders Day" }],
    activeSlug: "abc123",
  });
  assert.match(html, /href="\/events\/abc123"/);
  assert.match(html, /Builders Day/);
  assert.match(html, /Your events/);
  assert.doesNotMatch(html, /No events|Public attendees/);
});

test("pending or waitlisted registrations never link directly into the member workspace", () => {
  for (const status of ["pending", "waitlisted"])
    assert.equal(
      eventList.attendeeEventDestination({
        event: { slug: "abc123" },
        membership: { status },
      }),
      "/abc123",
    );
  assert.equal(
    eventList.attendeeEventDestination({
      event: { slug: "abc123" },
      membership: { status: "active" },
    }),
    "/events/abc123",
  );
});

test("event filters search actual registrations without mutating data and retain ended events in Past", () => {
  const items = [
    {
      event: {
        name: "Builders Day",
        starts_at: "2027-01-01T09:00:00Z",
        ends_at: "2027-01-01T17:00:00Z",
        status: "published",
        organizer_name: "Studio",
      },
    },
    {
      event: {
        name: "Design Night",
        starts_at: "2026-01-01T09:00:00Z",
        ends_at: "2026-01-01T17:00:00Z",
        status: "ended",
        venue_name: "Lagos",
      },
    },
  ];
  const now = Date.parse("2026-11-11T12:00:00Z");
  assert.equal(
    eventList.filterAttendeeEvents(items, "upcoming", " studio ", now)[0].event
      .name,
    "Builders Day",
  );
  assert.equal(
    eventList.filterAttendeeEvents(items, "past", "LAGOS", now)[0].event.name,
    "Design Night",
  );
  assert.equal(
    eventList.filterAttendeeEvents(items, "all", "missing", now).length,
    0,
  );
  assert.equal(items[0].event.name, "Builders Day");
});

test("membership reads retain approval states, exclude departed memberships and distinguish outages from empty accounts", async () => {
  for (const available of [true, false]) {
    const calls = [];
    const { loadAttendeeEventSnapshot } = compile("../lib/attendee-events.ts", {
      "server-only": {},
      "./api/server": {
        serverApi: async () => ({
          GET: async (...args) => {
            calls.push(args);
            return {
              response: { ok: available },
              data: available
                ? {
                    items: [
                      "active",
                      "pending",
                      "waitlisted",
                      "left",
                      "removed",
                      "rejected",
                    ].map((status) => ({ membership: { status } })),
                  }
                : undefined,
            };
          },
        }),
      },
    });
    const result = await loadAttendeeEventSnapshot();
    assert.equal(calls[0][0], "/me/events");
    assert.ok(calls[0][1].signal instanceof AbortSignal);
    if (available) {
      assert.deepEqual(
        Array.from(result.items, (item) => item.membership.status),
        ["active", "pending", "waitlisted"],
      );
      assert.ok(Number.isFinite(result.readAt));
    } else assert.equal(result, null);
  }
});

test("Discover, requests and My events guard the attendee account before rendering private data", async () => {
  for (const route of ["discover/page", "requests/page", "page"]) {
    let reads = 0;
    const { default: Page } = compile(`../app/attendee/${route}.tsx`, {
      "@/lib/session": {
        requireAccount: async (role) => {
          assert.equal(role, "attendee");
          throw new Error("wrong account redirect");
        },
      },
      "@/lib/attendee-events": {
        loadAttendeeEventSnapshot: async () => {
          reads++;
        },
      },
      "@/lib/api/server": {},
      "@/components/auth/workspace": {},
      "@/components/ui": {},
      "@/components/attendee/my-events": {},
      "@/components/attendee/network-frame": {},
      "../connections/connections-tabs": {},
    });
    await assert.rejects(Page(), /wrong account redirect/);
    assert.equal(reads, 0);
  }
});
