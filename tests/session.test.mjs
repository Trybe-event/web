import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function sessionHarness({
  userId = "test-user",
  lookup = {},
  apiMocks = "0",
} = {}) {
  const source = readFileSync(
    new URL("../lib/session.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const redirects = [];
  let accountLookups = 0;
  const dependencies = {
    "server-only": {},
    "@clerk/nextjs/server": { auth: async () => ({ userId }) },
    "next/navigation": {
      redirect: (destination) => {
        redirects.push(destination);
        throw new Error(`redirect:${destination}`);
      },
    },
    "./api/server": {
      serverApi: async () => ({
        GET: async () => {
          accountLookups++;
          if (lookup instanceof Error) throw lookup;
          return lookup;
        },
      }),
    },
    "./account": {
      isAccountType: (type) => type === "organizer" || type === "attendee",
      workspacePath: (type) => `/${type}`,
    },
    "./auth-config": { authConfigured: () => true },
  };
  const compiledModule = { exports: {} };
  const execute = vm.runInNewContext(
    `(function(require,module,exports){${compiled}\n})`,
    {
      process: {
        env: { NODE_ENV: "development", NEXT_PUBLIC_API_MOCKS: apiMocks },
      },
      AbortSignal,
    },
  );
  execute(
    (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    compiledModule,
    compiledModule.exports,
  );
  return {
    session: compiledModule.exports,
    redirects,
    accountLookups: () => accountLookups,
  };
}

test("an API 401 cannot send a Clerk-authenticated user into a sign-in loop", async () => {
  const harness = sessionHarness({ lookup: { response: { status: 401 } } });
  assert.equal((await harness.session.getSession()).kind, "unavailable");
  assert.equal(
    (await harness.session.requireAccount("attendee")).unavailable,
    true,
  );
  assert.equal(harness.redirects.length, 0);
});
test("only the contract's account-not-found response permits onboarding", async () => {
  const missingAccount = sessionHarness({
    lookup: { response: { status: 404 }, error: { code: "not_found" } },
  });
  assert.equal((await missingAccount.session.getSession()).kind, "unbound");
  await assert.rejects(
    missingAccount.session.requireAccount("attendee"),
    /redirect:\/account\/setup/,
  );
  for (const lookup of [
    { response: { status: 404 } },
    new SyntaxError("HTML instead of API JSON"),
    new Error("Network unavailable"),
  ]) {
    assert.equal(
      (await sessionHarness({ lookup }).session.getSession()).kind,
      "unavailable",
    );
  }
});
test("signed-out visits redirect before calling the account API", async () => {
  const harness = sessionHarness({ userId: null });
  await assert.rejects(
    harness.session.requireAccount("organizer"),
    /redirect:\/organizer\/sign-in/,
  );
  assert.equal(harness.accountLookups(), 0);
});
test("mock mode cannot replace a server-bound organizer with an attendee", async () => {
  const harness = sessionHarness({
    apiMocks: "1",
    lookup: {
      data: { type: "organizer", id: "test-organizer" },
      response: { status: 200 },
    },
  });
  assert.equal((await harness.session.getSession()).account.type, "organizer");
  await assert.rejects(
    harness.session.requireAccount("attendee"),
    /redirect:\/organizer/,
  );
  assert.equal(
    (await harness.session.requireAccount("organizer")).account.type,
    "organizer",
  );
});

test("operator-provisioned administrators are recognized but cannot enter attendee or organizer workspaces", async () => {
  const harness = sessionHarness({
    lookup: {
      data: { type: "admin", id: "operator" },
      response: { status: 200 },
    },
  });
  assert.equal((await harness.session.getSession()).account.type, "admin");
  for (const workspace of ["attendee", "organizer"])
    await assert.rejects(
      harness.session.requireAccount(workspace),
      /redirect:\/admin/,
    );
});
