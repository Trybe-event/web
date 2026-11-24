import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

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

const redirected = (target) => {
  throw new Error(`redirect:${target}`);
};
const account = compile("../lib/account.ts");
const routes = compile("../lib/routes.ts");
const unbound = { getSession: async () => ({ kind: "unbound" }) };

// A new sign-in has no Trybe account yet. Having opened the attendee or organizer
// page, it must finish that type, not see the attendee/organizer chooser again.
test("sign-up and sign-in pages send a new sign-in to their own type's completion step", async () => {
  const { AuthPage } = compile("../components/auth/auth-page.tsx", {
    "next/navigation": { redirect: redirected },
    "@/lib/account": account,
    "@/lib/routes": routes,
    "@/lib/session": unbound,
    "./auth-form": { AuthForm: () => null },
    "./auth-shell": { AuthShell: () => null },
    "@/components/legal/legal-notice": { TermsConsent: () => null },
  });
  for (const type of ["attendee", "organizer"])
    for (const mode of ["sign-up", "sign-in"])
      await assert.rejects(
        AuthPage({ type, mode }),
        new RegExp(`^Error: redirect:/${type}/complete$`),
        `${type} ${mode}`,
      );
  await assert.rejects(
    AuthPage({ type: "attendee", mode: "sign-up", eventSlug: "devfest-lagos" }),
    /redirect:\/attendee\/complete\?event=devfest-lagos/,
  );
});

test("typed workspaces finish setting up their own type", async () => {
  const session = compile("../lib/session.ts", {
    "server-only": {},
    "next/navigation": { redirect: redirected },
    "@clerk/nextjs/server": {
      auth: async () => ({ userId: "user_1", getToken: async () => "t" }),
    },
    "./account": account,
    "./auth-config": { authConfigured: () => true },
    "./api/server": {
      serverApi: async () => ({
        GET: async () => ({
          data: undefined,
          error: { code: "not_found" },
          response: { status: 404 },
        }),
      }),
    },
  });
  for (const type of ["attendee", "organizer"])
    await assert.rejects(
      session.requireAccount(type),
      new RegExp(`redirect:/${type}/complete$`),
    );
});
