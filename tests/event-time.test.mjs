import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const javascript = ts.transpileModule(
  readFileSync(new URL("../lib/event-time.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.ESNext } },
).outputText;
const { eventTimeToISO, localEventTime } = await import(
  `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`
);
test("event times use selected timezone instead of the browser timezone", () => {
  assert.equal(
    eventTimeToISO("2026-11-01T11:00", "Africa/Lagos"),
    "2026-11-01T10:00:00.000Z",
  );
  assert.equal(
    eventTimeToISO("2026-11-01T11:00", "Asia/Kolkata"),
    "2026-11-01T05:30:00.000Z",
  );
  assert.equal(
    localEventTime("2026-11-01T10:00:00Z", "Africa/Lagos"),
    "2026-11-01T11:00",
  );
});
test("nonexistent daylight-saving times are rejected rather than silently shifted", () => {
  assert.throws(
    () => eventTimeToISO("2026-03-08T02:30", "America/New_York"),
    /doesn't exist/,
  );
  assert.equal(
    eventTimeToISO("2026-03-08T03:30", "America/New_York"),
    "2026-03-08T07:30:00.000Z",
  );
});
