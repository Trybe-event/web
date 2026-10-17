import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function workspaceHarness({
  status = "active",
  available = true,
  role = "attendee",
} = {}) {
  const compiled = ts.transpileModule(
    readFileSync(new URL("../lib/event-workspace.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const loadedModule = { exports: {} };
  const calls = [];
  const dependencies = {
    "server-only": {},
    react: { cache: (fn) => fn },
    "next/navigation": {
      notFound: () => {
        throw new Error("not-found");
      },
    },
    "./routes": { isEventSlug: (slug) => slug === "community" },
    "./session": {
      requireAccount: async (type) => {
        assert.equal(type, "attendee");
        if (role !== type) throw new Error("redirect");
        return { account: { id: "account", type } };
      },
    },
    "./api/server": {
      serverApi: async () => ({
        GET: async (path, options) => {
          calls.push({ path, options });
          return {
            response: { ok: available },
            data: available
              ? {
                  items: [
                    {
                      event: {
                        id: "owned-event",
                        slug: "community",
                        name: "Community",
                      },
                      membership: { status },
                    },
                  ],
                }
              : undefined,
          };
        },
      }),
    },
  };
  vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, {
    AbortSignal,
  })((name) => dependencies[name], loadedModule, loadedModule.exports);
  return { load: loadedModule.exports.requireEventWorkspace, calls };
}
test("only active memberships can reach any event workspace route", async () => {
  for (const status of ["left", "removed"])
    await assert.rejects(
      workspaceHarness({ status }).load("community"),
      /not-found/,
    );
  const active = workspaceHarness();
  const result = await active.load("community");
  assert.equal(result.kind, "member");
  assert.equal(result.event.id, "owned-event");
  assert.equal(active.calls[0].path, "/me/events");
  assert.ok(active.calls[0].options.signal instanceof AbortSignal);
});
test("wrong account type and invalid slugs never query membership data", async () => {
  const wrongRole = workspaceHarness({ role: "organizer" });
  await assert.rejects(wrongRole.load("community"), /redirect/);
  assert.equal(wrongRole.calls.length, 0);
  const invalid = workspaceHarness();
  await assert.rejects(invalid.load("organizer"), /not-found/);
  assert.equal(invalid.calls.length, 0);
});
test("membership service failure fails closed without claiming an event does not exist", async () => {
  assert.equal(
    (await workspaceHarness({ available: false }).load("community")).kind,
    "unavailable",
  );
});
