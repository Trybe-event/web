import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const javascript = ts.transpileModule(
  readFileSync(new URL("../lib/connection-action.ts", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const { connectionAction, profileLinkHref } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);
const profile = {
  attendee_id: "one",
  full_name: "One",
  relationship: "none",
  accepting_requests: true,
};
test("requests need explicit availability, no existing relationship and open networking", () => {
  assert.equal(connectionAction(profile, "open").kind, "request");
  for (const accepting_requests of [false, undefined])
    assert.equal(
      connectionAction({ ...profile, accepting_requests }, "open").kind,
      "unavailable",
    );
  assert.equal(
    connectionAction({ ...profile, relationship: undefined }, "open").kind,
    "unavailable",
  );
  for (const state of ["closed", "not_open"])
    assert.equal(connectionAction(profile, state).kind, "unavailable");
});
test("accepted and pending connections retain truthful states when networking closes", () => {
  for (const [relationship, expected] of [
    ["connected", "connected"],
    ["self", "self"],
    ["pending_outgoing", "outgoing"],
    ["pending_incoming", "incoming"],
  ])
    assert.equal(
      connectionAction({ ...profile, relationship }, "closed").kind,
      expected,
    );
});
test("visible contact links cannot execute scripts or inject mail headers", () => {
  assert.equal(profileLinkHref("portfolio", "javascript:alert(1)"), undefined);
  assert.equal(
    profileLinkHref("email", "a@example.test\r\nBcc:other@example.test"),
    undefined,
  );
  assert.equal(
    profileLinkHref("portfolio", "https://example.test/work"),
    "https://example.test/work",
  );
  assert.equal(
    profileLinkHref("whatsapp", "+234 800 000 0000"),
    "https://wa.me/2348000000000",
  );
});
