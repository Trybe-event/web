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
const {
  passCode,
  checkInsCsv,
  checkedInOn,
  eventToday,
  searchByName,
  checkInDays,
  shouldSend,
} = loaded.exports;

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

const people = [
  "Magnetic Okoro",
  "Emmanuel Itighise",
  "Ade Olawale",
  "Adé Bakare",
  "Kemi Adeyemi",
  "Olumide Eze",
].map((attendee_name, i) => ({ id: String(i), attendee_name }));
const names = (typed, limit) =>
  searchByName(people, typed, limit).items.map((p) => p.attendee_name);

test("name search matches the start of a first name or surname", () => {
  // "e" used to match every name containing an e.
  assert.deepEqual(names("e"), ["Emmanuel Itighise", "Olumide Eze"]);
  assert.deepEqual(names("itig"), ["Emmanuel Itighise"]);
  assert.deepEqual(names("eze"), ["Olumide Eze"]);
  assert.deepEqual(names("mag"), ["Magnetic Okoro"]);
  assert.deepEqual(names("net"), []);
});

test("name search ignores case and accents, takes words in any order, and ranks", () => {
  // Names starting with the query come before surname matches.
  assert.deepEqual(names("ade"), ["Adé Bakare", "Ade Olawale", "Kemi Adeyemi"]);
  assert.deepEqual(names("OLA ade"), ["Ade Olawale"]);
  assert.equal(names("   ").length, 0);
  const capped = searchByName(people, "a", 1);
  assert.equal(capped.items.length, 1);
  assert.ok(capped.total > 1);
});

test("the day picker lists days with check-ins, newest first, always with today", () => {
  const days = checkInDays(rows, "2026-12-03");
  assert.deepEqual([...days], ["2026-12-03", "2026-12-02", "2026-12-01"]);
  assert.deepEqual([...checkInDays([], "2026-12-03")], ["2026-12-03"]);
});

test("the camera sends a pass once, and again only after a failed attempt", () => {
  assert.equal(shouldSend(null, "", false, 0), false);
  assert.equal(shouldSend("abc", "", false, 0), true);
  // Same pass still in front of the camera after a success: not sent again, so
  // "is checked in" is not replaced by "already checked in".
  assert.equal(shouldSend("abc", "abc", false, 60000), false);
  // After a failure, retried once the pause is over.
  assert.equal(shouldSend("abc", "abc", true, 1000), false);
  assert.equal(shouldSend("abc", "abc", true, 5000), true);
  assert.equal(shouldSend("xyz", "abc", false, 0), true);
});
