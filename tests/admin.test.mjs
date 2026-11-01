import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const reportId = "11111111-1111-4111-8111-111111111111";

function harness({
  session = { kind: "bound", account: { type: "admin" } },
  status = 200,
  fails = false,
} = {}) {
  const calls = [];
  const loaded = { exports: {} };
  const dependencies = {
    "server-only": {},
    "next/navigation": {
      redirect: (destination) => {
        throw new Error(`redirect:${destination}`);
      },
      notFound: () => {
        throw new Error("not-found");
      },
    },
    "./session": { getSession: async () => session },
    "./api/server": {
      serverApi: async () => ({
        GET: async (path, options) => {
          calls.push({ path, options });
          if (fails) throw new Error("Network error");
          return {
            response: { status, ok: status === 200 },
            data: status === 200 ? { items: [], id: reportId } : undefined,
          };
        },
      }),
    },
  };
  const javascript = ts.transpileModule(
    fs.readFileSync(new URL("../lib/admin.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(`(function(require,module,exports){${javascript}\n})`, {
    AbortSignal,
  })((name) => dependencies[name], loaded, loaded.exports);
  return { ...loaded.exports, calls };
}

test("non-administrators cannot fetch the report queue or individual report data", async () => {
  for (const type of ["attendee", "organizer"]) {
    const access = harness({ session: { kind: "bound", account: { type } } });
    await assert.rejects(access.loadReports(), /not-found/);
    await assert.rejects(access.loadReport(reportId), /not-found/);
    assert.equal(access.calls.length, 0);
  }
  const unbound = harness({ session: { kind: "unbound" } });
  await assert.rejects(unbound.loadReports(), /not-found/);
  assert.equal(unbound.calls.length, 0);
});

test("signed-out and unconfigured access redirects before reports are fetched", async () => {
  for (const kind of ["signed-out", "unconfigured"]) {
    const access = harness({ session: { kind } });
    await assert.rejects(access.loadReports(), /redirect:\/admin\/sign-in/);
    assert.equal(access.calls.length, 0);
  }
});

test("account lookup failures and report outages do not produce an empty success", async () => {
  const denied = harness({ session: { kind: "unavailable" } });
  assert.equal((await denied.loadReports()).kind, "unavailable");
  assert.equal(denied.calls.length, 0);
  for (const options of [{ status: 403 }, { status: 503 }, { fails: true }]) {
    const access = harness(options);
    assert.equal((await access.loadReports()).kind, "unavailable");
    assert.equal((await access.loadReport(reportId)).kind, "unavailable");
  }
});

test("admin report reads use reviewed routes, cursor and per-request timeouts", async () => {
  const access = harness();
  assert.equal((await access.loadReports("page-2")).kind, "loaded");
  assert.equal(access.calls[0].options.params.query.cursor, "page-2");
  assert.ok(access.calls[0].options.signal instanceof AbortSignal);
  assert.equal((await access.loadReport(reportId)).kind, "loaded");
  assert.equal(access.calls[1].path, "/admin/reports/{reportId}");
  const missing = harness({ status: 404 });
  assert.equal((await missing.loadReport(reportId)).kind, "not_found");
  const invalid = harness();
  await assert.rejects(invalid.loadReport("not-a-report"), /not-found/);
  assert.equal(invalid.calls.length, 0);
});

test("moderation requires a supported action and a nonblank bounded reason", () => {
  const javascript = ts.transpileModule(
    fs.readFileSync(
      new URL("../lib/admin-reports.ts", import.meta.url),
      "utf8",
    ),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${javascript}\n})`)(
    require,
    loaded,
    loaded.exports,
  );
  const { reportActionSchema, REPORT_ACTIONS } = loaded.exports;
  for (const action of ["dismiss", "warn", "remove_membership", "suspend"]) {
    assert.equal(
      reportActionSchema.safeParse({ action, reason: "Reviewed evidence" })
        .success,
      true,
    );
    assert.ok(REPORT_ACTIONS[action].consequence);
  }
  for (const reason of ["", "   ", "a".repeat(1001)])
    assert.equal(
      reportActionSchema.safeParse({ action: "warn", reason }).success,
      false,
    );
  assert.equal(
    reportActionSchema.safeParse({ action: "promote_admin", reason: "No" })
      .success,
    false,
  );
  assert.match(REPORT_ACTIONS.warn.consequence, /does not send/);
});
