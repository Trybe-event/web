import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../lib/event-analytics.ts", import.meta.url),
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
  Map,
  Math,
  Number,
  String,
  Array,
})(loaded, loaded.exports);
const { percent, hoursFor, busiestHour, hourLabel, analyticsCsv } =
  loaded.exports;

const analytics = {
  registrations: {
    by_status: {
      active: 2,
      pending: 0,
      waitlisted: 0,
      rejected: 0,
      left: 1,
      removed: 0,
    },
    total: 3,
  },
  checkin: {
    enabled: true,
    admitted: 2,
    checked_in: 1,
    not_checked_in: 1,
    rate: 0.5,
    days: [{ day: "2082-12-01", checked_in: 1 }],
    arrivals: [{ day: "2082-12-01", hour: 9, checked_in: 1 }],
  },
  sessions: [{ title: "=Keynote", starts_at: "", bookmarks: 2 }],
  networking: {
    requests_sent: 3,
    requests_accepted: 1,
    connections: 1,
    conversations: 1,
  },
  engagement: {
    questions_asked: 2,
    questions_answered: 1,
    announcements: 1,
    announcement_reach: 2,
  },
  questions: [
    {
      label: "Track",
      kind: "select",
      answered: 3,
      choices: [{ choice: "AI", people: 2 }],
    },
  ],
};

test("percentages and hour labels", () => {
  assert.equal(percent(0.5), "50%");
  assert.equal(percent(2 / 3), "67%");
  assert.equal(percent(null), "–");
  assert.equal(hourLabel(9), "09:00");
});

test("the hour chart always has 24 hours and finds the busiest", () => {
  const hours = hoursFor(
    [
      { day: "d1", hour: 9, checked_in: 4 },
      { day: "d1", hour: 10, checked_in: 7 },
      { day: "d2", hour: 9, checked_in: 50 },
    ],
    "d1",
  );
  assert.equal(hours.length, 24);
  assert.equal(hours[9].checked_in, 4);
  assert.equal(hours[0].checked_in, 0);
  assert.equal(busiestHour(hours).hour, 10);
  assert.equal(busiestHour(hoursFor([], "d1")), null);
});

test("the CSV has every section, quotes cells and stops formulas", () => {
  const lines = analyticsCsv(analytics, "Hack Day").trim().split("\r\n");
  assert.equal(lines[0], '"Section","Measure","Value"');
  for (const want of [
    '"Registrations","Admitted","2"',
    '"Check-in","Check-in rate","50%"',
    '"Arrivals by hour","2082-12-01 09:00","1"',
    `"Saved to My agenda","'=Keynote","2"`,
    '"Networking","Requests accepted","1"',
    '"Question: Track","AI","2"',
  ])
    assert.ok(lines.includes(want), want);
});
