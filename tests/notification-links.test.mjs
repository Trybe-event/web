import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(file) {
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const javascript = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(module,exports){${javascript}\n})`, {
    String,
  })(loaded, loaded.exports);
  return loaded.exports;
}

const { notificationHref, bellLabel } = load("../lib/notifications/links.ts");
const { attendeeSection } = load("../lib/attendee-navigation.ts");
const slugs = new Map([["e1", "devfest"]]);

test("each notification opens where it belongs", () => {
  const at = (kind, extra = {}) =>
    notificationHref(
      { kind, event_id: null, subject_id: null, ...extra },
      slugs,
    );
  assert.equal(
    at("organizer_update", { event_id: "e1" }),
    "/events/devfest/updates",
  );
  assert.equal(
    at("question_answered", { event_id: "e1" }),
    "/events/devfest/updates",
  );
  // An event the attendee is no longer in has no code to link to.
  assert.equal(at("organizer_update", { event_id: "gone" }), "/attendee");
  assert.equal(at("message", { subject_id: "c1" }), "/attendee/inbox/c1");
  assert.equal(at("connection_accepted"), "/attendee/connections");
  assert.equal(at("connection_request"), "/attendee/requests");
});

test("the bell shows nothing, a count, or 9+", () => {
  assert.equal(bellLabel(0), null);
  assert.equal(bellLabel(1), "1");
  assert.equal(bellLabel(9), "9");
  assert.equal(bellLabel(12), "9+");
});

test("the notifications page is not under the Profile tab", () => {
  assert.equal(attendeeSection("/attendee/notifications"), "notifications");
  assert.equal(
    attendeeSection("/attendee/notifications/preferences"),
    "notifications",
  );
  assert.equal(attendeeSection("/attendee/profile"), "profile");
});
