import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
function compile(file, dependencies) {
  const source = ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    },
  ).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`, {
    AbortSignal,
    Error,
  })(
    (name) => (name in dependencies ? dependencies[name] : require(name)),
    loadedModule,
    loadedModule.exports,
  );
  return loadedModule.exports;
}
function eventAccess({
  access = { account: { id: "organizer" } },
  status = 200,
  data,
  failure,
  redirect = false,
} = {}) {
  const requests = [];
  const guards = [];
  const notFound = Object.assign(new Error("Not found"), {
    digest: "NEXT_HTTP_ERROR_FALLBACK;404",
  });
  const functions = compile("../lib/organizer-event.ts", {
    "server-only": {},
    react: { cache: (operation) => operation },
    "next/navigation": {
      notFound: () => {
        throw notFound;
      },
    },
    "./session": {
      requireAccount: async (role) => {
        guards.push(role);
        if (redirect) throw new Error("account redirect");
        return access;
      },
    },
    "./api/server": {
      serverApi: async () => ({
        GET: async (...args) => {
          requests.push(args);
          if (failure) throw failure;
          return { data, response: { status, ok: status === 200 } };
        },
      }),
    },
  });
  return { ...functions, requests, guards, notFound };
}

test("event ownership is requested with the server session only after an organizer guard", async () => {
  const event = { id: "owned-event", name: "Build Day", status: "draft" };
  const view = eventAccess({ data: event });
  const result = await view.loadOwnedEvent("owned-event");
  assert.equal(result.event, event);
  assert.deepEqual(view.guards, ["organizer"]);
  assert.equal(view.requests[0][0], "/events/{eventId}");
  assert.equal(view.requests[0][1].params.path.eventId, "owned-event");
  assert.ok(view.requests[0][1].signal instanceof AbortSignal);
});

test("wrong account and unavailable account never fetch an event", async () => {
  const wrong = eventAccess({ redirect: true });
  await assert.rejects(wrong.loadOwnedEvent("other-event"), /account redirect/);
  assert.equal(wrong.requests.length, 0);
  const unavailable = eventAccess({ access: { unavailable: true } });
  assert.equal(await unavailable.loadOwnedEvent("other-event"), null);
  assert.equal(unavailable.requests.length, 0);
});

test("foreign, missing and malformed event IDs preserve the same not-found control flow", async () => {
  for (const status of [400, 404]) {
    const view = eventAccess({ status });
    await assert.rejects(
      view.loadOwnedEvent("unavailable-event"),
      (error) => error === view.notFound,
    );
  }
});

test("API outages and expired authorization cannot become a fake empty event or program", async () => {
  for (const options of [
    { status: 401 },
    { status: 403 },
    { status: 503 },
    { failure: new Error("timeout") },
  ]) {
    const view = eventAccess(options);
    assert.equal(await view.loadOwnedEvent("owned-event"), null);
    assert.equal(await view.loadOwnedProgram("owned-event"), null);
  }
});

test("event pages do not load statistics or program before ownership is confirmed", async () => {
  for (const route of [
    "page",
    "analytics/page",
    "attendance/page",
    "preview/page",
    "settings/page",
    "share/page",
    "edit/page",
  ]) {
    let leakedFetches = 0;
    const fetchData = async () => {
      leakedFetches++;
      throw new Error("Unauthorized fetch");
    };
    const { default: Page } = compile(
      `../app/organizer/events/[id]/${route}.tsx`,
      {
        next: {},
        "@/lib/organizer-event": {
          loadOwnedEvent: async () => null,
          loadOwnedProgram: fetchData,
        },
        "@/lib/organizer-dashboard": {
          loadOrganizerEvents: fetchData,
          loadRegistrationTrend: fetchData,
        },
        "@/components/organizer/event-overview": {},
        "@/components/organizer/registration-trend": {},
        "@/components/organizer/retry-dashboard": {},
        "@/components/organizer/event-lifecycle": {},
        "@/components/organizer/delete-draft": {},
        "@/components/events/event-hero": {},
        "@/components/events/program-view": {},
        "@/components/organizer/event-share": {},
        "@/components/organizer/event-fields": {},
        "@/components/organizer/event-form": {},
        "@/components/organizer/event-settings": {},
        "@/components/ui": {},
      },
    );
    assert.equal(
      await Page({ params: Promise.resolve({ id: "foreign-event" }) }),
      null,
    );
    assert.equal(leakedFetches, 0, route);
  }
});
