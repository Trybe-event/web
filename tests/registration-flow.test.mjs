import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToReadableStream } from "react-dom/server";
const require = createRequire(import.meta.url);
async function landing({
  state = "open",
  member = false,
  preview = "review",
  unavailable = false,
  session = "attendee",
  metadata = false,
} = {}) {
  const element = (tag) =>
    function TestElement({ children, ...props }) {
      return React.createElement(tag, props, children);
    };
  const dependencies = {
    "next/image": {
      default: ({ src, alt, className }) =>
        React.createElement("img", { src, alt, className }),
      __esModule: true,
    },
    "@/components/events/event-registration": {
      EventRegistration: ({ slug }) =>
        React.createElement("div", { "data-event": slug }, "Join the event"),
    },
    "@/components/auth/theme-toggle": {
      ThemeToggle: () => React.createElement("button", null, "Theme"),
    },
    "@/components/events/event-sharing": {
      EventSharing: () => React.createElement("div", null, "Share event"),
    },
    "@/lib/event-artwork": {
      artworkPath: (slug) => `/event-artwork/${slug}?format=og&theme=forest`,
    },
    "next/link": { default: element("a"), __esModule: true },
    "next/navigation": {
      notFound() {
        throw new Error("not found");
      },
    },
    "@/components/events/join-review": {
      JoinReview: () => React.createElement("button", null, "Confirm and join"),
    },
    "@/components/events/program-view": {
      ProgramView: () => React.createElement("div", null, "Event sessions"),
    },
    "@/components/registration/event-link-states": {
      EventLinkState: ({ outcome }) =>
        React.createElement(
          "p",
          null,
          outcome.registrationState ?? outcome.kind,
        ),
    },
    "@/components/ui": { ButtonLink: element("a"), Logo: () => "trybe." },
    "@/lib/events": {
      getPublicEvent: async () =>
        unavailable
          ? { kind: "unavailable" }
          : {
              kind: "found",
              event: {
                name: "Trybe gathering",
                format: "physical",
                starts_at: "2026-12-01T09:00:00Z",
                ends_at: "2026-12-01T17:00:00Z",
                timezone: "Africa/Lagos",
                registration_state: state,
                image_url: "https://storage.example/cover.jpg",
                organizer_name: "Trybe Hosts",
                registration_closes_at: "2026-11-30T23:00:00Z",
              },
            },
      hasEventMembership: async () => member,
      getJoinPreview: async () => {
        assert.notEqual(
          member,
          null,
          "Unknown membership must not read a profile review",
        );
        return { kind: preview, preview: { alreadyMember: false } };
      },
    },
    "@/lib/routes": {
      isEventSlug: () => true,
      routes: {
        eventWorkspace: (slug) => `/events/${slug}`,
        attendeeSignIn: "/attendee/sign-in",
        attendeeSignUp: "/attendee/sign-up",
      },
      withEventParam: (path, slug) => `${path}?event=${slug}`,
    },
    "@/lib/session": {
      getSession: async () => ({
        kind:
          session === "signed-out"
            ? "signed-out"
            : session === "unavailable"
              ? "unavailable"
              : "bound",
        account: { type: session },
      }),
    },
  };
  const hero = { exports: {} };
  const heroCode = ts.transpileModule(
    readFileSync(
      new URL("../components/events/event-hero.tsx", import.meta.url),
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
  vm.runInNewContext(`(function(require,module,exports){${heroCode}\n})`)(
    (name) => dependencies[name] ?? require(name),
    hero,
    hero.exports,
  );
  dependencies["@/components/events/event-hero"] = hero.exports;
  const compiled = ts.transpileModule(
    readFileSync(new URL("../app/[slug]/page.tsx", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, {
    URL,
    process: { env: { NEXT_PUBLIC_APP_URL: "https://trybe.example" } },
  })((name) => dependencies[name] ?? require(name), loaded, loaded.exports);
  if (metadata)
    return loaded.exports.generateMetadata({
      params: Promise.resolve({ slug: "trybe-gathering" }),
    });
  const view = await loaded.exports.default({
    params: Promise.resolve({ slug: "trybe-gathering" }),
  });
  const stream = await renderToReadableStream(view);
  await stream.allReady;
  return new Response(stream).text();
}
test("registration requires a loaded profile review and open registration", async () => {
  assert.match(await landing(), /Confirm and join/);
  for (const options of [
    { preview: "unavailable" },
    { unavailable: true },
    { state: "closed" },
    { state: "not_open" },
  ]) {
    assert.doesNotMatch(await landing(options), /Confirm and join/);
  }
});

test("public landing renders event-local schedule and invitation entry points without profiles", async () => {
  const page = await landing({ session: "signed-out" });
  assert.match(page, /Trybe gathering/);
  assert.match(page, /src="https:\/\/storage.example\/cover.jpg"/);
  assert.match(page, /10:00/);
  assert.match(page, /18:00/);
  assert.match(page, /Organized by/);
  assert.match(page, /Trybe Hosts/);
  assert.match(page, /Registration closes/);
  assert.match(page, /object-contain/);
  assert.match(page, /data-event="trybe-gathering"/);
  assert.match(page, /id="join-event"/);
  assert.doesNotMatch(page, /I already have an account/);
  assert.doesNotMatch(page, /Confirm and join/);
  assert.doesNotMatch(
    await landing({ session: "organizer" }),
    /Join this event|Confirm and join/,
  );
  assert.doesNotMatch(
    await landing({ session: "unavailable" }),
    /Join this event|Confirm and join/,
  );
});
test("link metadata identifies only resolved events and never indexes invitation routes", async () => {
  const found = await landing({ metadata: true });
  assert.equal(found.openGraph.title, "Trybe gathering");
  assert.equal(found.robots.index, false);
  assert.equal(found.openGraph.images[0].width, 1200);
  assert.match(
    found.openGraph.images[0].url,
    /^https:\/\/trybe\.example\/event-artwork\//,
  );
  assert.equal(found.twitter.card, "summary_large_image");
  const failed = await landing({ metadata: true, unavailable: true });
  assert.equal(failed.title, "Event invitation");
  assert.equal(failed.openGraph, undefined);
});
test("existing membership remains accessible when registration closes", async () => {
  assert.match(
    await landing({ member: true, state: "closed" }),
    /Open your event workspace/,
  );
  assert.doesNotMatch(await landing({ member: true }), /Confirm and join/);
});

test("membership lookup failure offers retry without registration or profile onboarding", async () => {
  for (const state of ["open", "closed", "not_open"]) {
    const page = await landing({ member: null, state });
    assert.match(page, /unreachable/);
    assert.doesNotMatch(
      page,
      /Confirm and join|Create your profile|Open your event workspace/,
    );
  }
});
