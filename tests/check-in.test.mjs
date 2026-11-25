import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../lib/check-in.ts", import.meta.url),
  "utf8",
);
const javascript = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const loaded = { exports: {} };
vm.runInNewContext(`(function(module,exports){${javascript}\n})`, {
  Intl,
  Date,
  Set,
})(loaded, loaded.exports);
const { passCode, checkInsCsv, checkedInOn, eventToday } = loaded.exports;

const rows = [
  {
    registration_id: "a",
    attendee_name: 'Ada "AJ" Obi',
    event_day: "2026-12-01",
    checked_in_at: "2026-12-01T08:00:00Z",
    method: "scan",
  },
  {
    registration_id: "b",
    attendee_name: "=HYPERLINK(1)",
    event_day: "2026-12-02",
    checked_in_at: "2026-12-02T08:00:00Z",
    method: "manual",
  },
];

test("a scanned code is trimmed", () => {
  assert.equal(passCode("  abc123\r\n"), "abc123");
});

test("the CSV quotes names and neutralises formulas", () => {
  const lines = checkInsCsv(rows).split("\r\n");
  assert.equal(lines[0], '"Name","Event day","Checked in at (UTC)","Method"');
  assert.equal(
    lines[1],
    '"Ada ""AJ"" Obi","2026-12-01","2026-12-01T08:00:00Z","scan"',
  );
  assert.ok(lines[2].startsWith(`"'=HYPERLINK(1)"`));
});

test("checked in today counts only that day", () => {
  assert.deepEqual([...checkedInOn(rows, "2026-12-01")], ["a"]);
});

test("the event day follows the event's time zone", () => {
  const late = new Date("2026-12-01T23:30:00Z");
  assert.equal(eventToday("UTC", late), "2026-12-01");
  assert.equal(eventToday("Africa/Lagos", late), "2026-12-02");
  assert.equal(eventToday("Not/AZone", late), "2026-12-01");
});
