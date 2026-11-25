import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(
  new URL("../lib/agenda.ts", import.meta.url),
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
  Date,
  Set,
})(loaded, loaded.exports);
const { agenda, filterProgram, sessionKindLabel } = loaded.exports;

const at = (hour, minute = 0) =>
  `2082-12-01T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`;
const session = (id, start, end, kind = null) => ({
  id,
  title: id,
  starts_at: start,
  ends_at: end,
  kind,
});
const program = {
  days: [
    {
      id: "d1",
      sessions: [
        session("lunch", at(12), at(13), "break"),
        session("keynote", at(9), at(10), "keynote"),
        session("workshop", at(9, 30), at(11), "workshop"),
        session("panel", at(10), at(11), "panel"),
      ],
    },
    {
      id: "d2",
      sessions: [
        session("day2", "2082-12-02T09:00:00Z", "2082-12-02T10:00:00Z"),
      ],
    },
  ],
};

test("My agenda is in time order with clashes flagged both ways", () => {
  const items = agenda(program, [
    "day2",
    "workshop",
    "keynote",
    "lunch",
    "gone",
  ]);
  assert.deepEqual(
    items.map((item) => item.session.id),
    ["keynote", "workshop", "lunch", "day2"],
  );
  const clashes = Object.fromEntries(
    items.map((item) => [item.session.id, item.clashesWith.map((s) => s.id)]),
  );
  assert.deepEqual(clashes, {
    keynote: ["workshop"],
    workshop: ["keynote"],
    lunch: [],
    day2: [],
  });
});

test("sessions that only touch end to start do not clash", () => {
  const items = agenda(program, ["keynote", "panel"]);
  assert.ok(items.every((item) => item.clashesWith.length === 0));
});

test("the type filter keeps days and only matching sessions", () => {
  const filtered = filterProgram(program, "workshop");
  assert.equal(filtered.days.length, 2);
  assert.deepEqual(
    filtered.days.map((day) => day.sessions.map((s) => s.id)),
    [["workshop"], []],
  );
  assert.equal(filterProgram(program, ""), program);
});

test("type labels", () => {
  assert.equal(sessionKindLabel("keynote"), "Keynote");
  assert.equal(sessionKindLabel(null), null);
  assert.equal(sessionKindLabel("karaoke"), null);
});
