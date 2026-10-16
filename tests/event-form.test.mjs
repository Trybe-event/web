import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const compiled = ts.transpileModule(
  readFileSync(new URL("../lib/event-form.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const loaded = { exports: {} };
vm.runInNewContext(`(function(require,module,exports){${compiled}\n})`, {
  Intl,
  Date,
  URL,
})(createRequire(import.meta.url), loaded, loaded.exports);
const { eventDraftSchema, eventDraftValues } = loaded.exports;
test("empty event drafts are valid; unsafe time and link values never autosave", () => {
  assert.equal(eventDraftSchema.safeParse({}).success, true);
  for (const draft of [
    { timezone: "EST" },
    { timezone: "Invalid/Zone" },
    { starts_at: "2026" },
    { attendance_url: "javascript:alert(1)" },
    { attendance_url: "https://" },
  ])
    assert.equal(eventDraftSchema.safeParse(draft).success, false);
});
test("all closing windows must follow their opening time", () => {
  for (const [start, end] of [
    ["starts_at", "ends_at"],
    ["registration_opens_at", "registration_closes_at"],
    ["networking_opens_at", "networking_closes_at"],
  ]) {
    assert.equal(
      eventDraftSchema.safeParse({
        [start]: "2026-11-01T11:00:00Z",
        [end]: "2026-11-01T10:00:00Z",
      }).success,
      false,
    );
  }
});
test("draft extraction never sends immutable server event fields back in PATCH", () => {
  const values = eventDraftValues({
    id: "event",
    status: "published",
    slug: "stable-slug",
    name: "Community",
    registration_url: "https://example.test/community",
  });
  assert.equal(values.name, "Community");
  for (const key of ["id", "status", "slug", "registration_url"])
    assert.equal(key in values, false);
});
