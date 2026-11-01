import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import ts from "typescript";
const require = createRequire(import.meta.url);
function compile(path, dependencies = {}) {
  const source = ts.transpileModule(
    readFileSync(new URL(path, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`)(
    (name) => (name in dependencies ? dependencies[name] : require(name)),
    loaded,
    loaded.exports,
  );
  return loaded.exports;
}
const time = compile("../lib/event-time.ts");
const {
  programDaySchema,
  programDayError,
  sessionSchema,
  sessionScheduleErrors,
} = compile("../lib/event-program.ts", { "./event-time": time });
const event = {
  timezone: "Africa/Lagos",
  starts_at: "2026-11-01T08:00:00Z",
  ends_at: "2026-11-02T17:00:00Z",
};
const session = {
  title: "Building securely",
  description: "A practical security session",
  starts_at: "2026-11-01T10:00:00Z",
  ends_at: "2026-11-01T11:00:00Z",
  speakers: [
    {
      name: "Ada Example",
      role: "Security engineer",
      organization: "Example",
      bio: "Builds secure systems",
    },
  ],
};
test("sessions accept details, times and full speaker information", () => {
  const result = sessionSchema.safeParse(session);
  assert.equal(result.success, true);
  assert.equal(
    Object.keys(sessionScheduleErrors(session, { date: "2026-11-01" }, event))
      .length,
    0,
  );
});
test("missing required session fields and invalid speaker entries block saving", () => {
  for (const value of [
    { ...session, title: " " },
    { ...session, starts_at: "" },
    { ...session, ends_at: session.starts_at },
    { ...session, speakers: [{ name: " " }] },
    {
      ...session,
      speakers: [{ name: "Ada Example" }, { name: "ada  example" }],
    },
  ])
    assert.equal(sessionSchema.safeParse(value).success, false);
});
test("sessions must belong to their selected day and fit the saved event schedule", () => {
  assert.ok(
    sessionScheduleErrors(session, { date: "2026-11-02" }, event).starts_at,
  );
  assert.ok(
    sessionScheduleErrors(
      { ...session, starts_at: "2026-11-01T06:00:00Z" },
      { date: "2026-11-01" },
      event,
    ).starts_at,
  );
  assert.ok(
    sessionScheduleErrors(
      { ...session, ends_at: "2026-11-03T10:00:00Z" },
      { date: "2026-11-01" },
      event,
    ).starts_at,
  );
});
test("program day dates are required and must fall within the event's local dates", () => {
  assert.equal(programDaySchema.safeParse({ date: "" }).success, false);
  assert.equal(programDayError("2026-11-01", event), undefined);
  assert.ok(programDayError("2026-10-31", event));
  assert.ok(programDayError("2026-11-03", event));
  assert.ok(programDayError("2026-11-01", {}));
});
