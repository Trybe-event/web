// Unit tests for the event-link state screens (web#10), run with node --test.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(
  new URL("../lib/registration/link-states.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { eventLinkScreen } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);

const notFoundOutcome = { kind: "lookup", httpStatus: 404, code: "not_found" };

test("unknown, draft and private events render the identical screen", () => {
  // The API answers 404 with the same code for all three; the screen that
  // comes back must be the same object, so one can't infer existence.
  const unknown = eventLinkScreen(notFoundOutcome, "spring-conf-2026");
  const draft = eventLinkScreen(notFoundOutcome, "some-unpublished-draft");
  const viaUnknownCode = eventLinkScreen(
    { kind: "lookup", httpStatus: 404, code: "not_found" },
    null,
  );
  assert.deepEqual(unknown, draft);
  assert.deepEqual(unknown, viaUnknownCode);
  assert.equal(unknown.title, String(unknown.title)); // plain string, no slug moulded in
  assert.ok(!unknown.title.includes("spring-conf-2026"));
});

test("missing event copy never claims the event exists or doesn't", () => {
  const screen = eventLinkScreen(notFoundOutcome, "spring-conf-2026");
  const combined = `${screen.title} ${screen.body}`.toLowerCase();
  for (const forbidden of [
    "exists",
    "exist",
    "doesn't exist",
    "not a real",
    "no event",
    "no such event",
    "private",
    "draft",
    "deleted",
    "cancelled",
  ]) {
    assert.ok(
      !combined.includes(forbidden),
      `copy leaks existence through "${forbidden}"`,
    );
  }
});

test("every state has a clear next action", () => {
  const outcomes = {
    unknown: notFoundOutcome,
    unavailable: { kind: "unreachable" },
    notOpen: { kind: "published", registrationState: "not_open" },
    closed: { kind: "published", registrationState: "closed" },
    joined: { kind: "already-member" },
  };
  for (const [label, outcome] of Object.entries(outcomes)) {
    const screen = eventLinkScreen(outcome, "spring-conf-2026");
    if (screen.action.kind === "link")
      assert.match(screen.action.href, /^\//, `${label} action href`);
    if (screen.action.kind === "refresh")
      assert.equal(screen.action.label, "Try again");
    assert.ok(screen.action.label.length > 3, `${label} action label`);
    assert.ok(screen.body.length > 20, `${label} body copy`);
  }
});

test("the four state screens are distinct and keyed", () => {
  // The issue defines four screens: not found/unavailable, not open,
  // closed, already joined. Both ways of the API being unreachable
  // (upstream error code, network failure) share the unavailable screen,
  // and that shared screen must be identical too.
  const upstreamError = eventLinkScreen(
    { kind: "lookup", httpStatus: 500, code: "upstream" },
    "x",
  );
  const unreachable = eventLinkScreen({ kind: "unreachable" }, "x");
  assert.deepEqual(upstreamError, unreachable);
  const keys = [
    unreachable,
    eventLinkScreen({ kind: "published", registrationState: "not_open" }, "x"),
    eventLinkScreen({ kind: "published", registrationState: "closed" }, "x"),
    eventLinkScreen({ kind: "already-member" }, "spring-conf-2026"),
  ].map((s) => s.key);
  assert.deepEqual(
    new Set(keys).size,
    4,
    "the four failure paths keep their own screen: " + keys.join(","),
  );
  // A 404 with an unexpected code falls back to the non-revealing
  // unavailable screen: it must neither confirm nor deny existence.
  const odd404 = eventLinkScreen(
    { kind: "lookup", httpStatus: 404, code: "surprise" },
    "x",
  );
  assert.equal(odd404.key, "unavailable");
  assert.notEqual(odd404.key, "unknown");
});

test("already-joined action points into the event workspace", () => {
  const screen = eventLinkScreen(
    { kind: "already-member" },
    "spring-conf-2026",
  );
  assert.equal(screen.action.kind, "link");
  assert.equal(screen.action.href, "/events/spring-conf-2026");
});

test("an outcome the mapper never produced is a programming error", () => {
  assert.throws(() => eventLinkScreen({ kind: "totally-fake" }));
});
