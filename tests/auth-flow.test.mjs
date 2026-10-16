import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

// Run the actual TypeScript policy without adding a test runner dependency.
const source = readFileSync(
  new URL("../lib/auth-flow.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { signInStep, authenticationDestination } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);

test("partial and unsupported sign-ins cannot reach a workspace", () => {
  for (const status of [
    null,
    "needs_identifier",
    "needs_first_factor",
    "needs_second_factor",
    "needs_client_trust",
  ]) {
    assert.throws(() => signInStep(status, []), /verification/);
  }
  assert.throws(
    () => signInStep("needs_first_factor", ["email_code"]),
    /verification/,
  );
});
test("device trust and configured MFA select a supported challenge", () => {
  assert.equal(signInStep("needs_client_trust", ["email_code"]), "email");
  assert.equal(
    signInStep("needs_second_factor", ["totp", "phone_code"]),
    "totp",
  );
  assert.equal(signInStep("needs_second_factor", ["phone_code"]), "phone");
  assert.equal(signInStep("needs_new_password", []), "new-password");
  assert.equal(signInStep("complete", []), "complete");
});
test("the event being joined survives a finished authentication attempt", () => {
  // A new attendee keeps the event into completion; a returning one goes back to it.
  assert.equal(
    authenticationDestination("/attendee", true, false, "atlas-summit"),
    "/attendee/complete?event=atlas-summit",
  );
  assert.equal(
    authenticationDestination("/attendee", false, false, "atlas-summit"),
    "/atlas-summit",
  );
  assert.equal(
    authenticationDestination("/attendee", true, false),
    "/attendee/complete",
  );
  assert.throws(
    () => authenticationDestination("/attendee", false, true, "atlas-summit"),
    /security step/,
  );
});

test("sign-up preserves completion and sign-in preserves the role route", () => {
  for (const base of ["/attendee", "/organizer"]) {
    assert.equal(
      authenticationDestination(base, true, false),
      `${base}/complete`,
    );
    assert.equal(authenticationDestination(base, false, false), base);
    assert.throws(
      () => authenticationDestination(base, true, true),
      /security step/,
    );
    assert.throws(
      () => authenticationDestination(base, false, true),
      /security step/,
    );
  }
});
