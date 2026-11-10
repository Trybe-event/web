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
const publicationSource = ts.transpileModule(
  readFileSync(new URL("../lib/event-publication.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const publicationModule = { exports: {} };
vm.runInNewContext(
  `(function(require,module,exports){${publicationSource}\n})`,
)(() => loaded.exports, publicationModule, publicationModule.exports);
const {
  publicationErrors,
  createPublicationLock,
  eventStageErrors,
  eventFieldStage,
} = publicationModule.exports;

test("double confirmation shares one request and a failed request permits retry", async () => {
  const run = createPublicationLock();
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const first = run(async () => {
    calls++;
    await gate;
    throw new Error("timeout");
  });
  const duplicate = run(async () => {
    calls++;
  });
  assert.equal(first, duplicate);
  release();
  await assert.rejects(first, /timeout/);
  assert.equal(calls, 1);
  await run(async () => {
    calls++;
  });
  assert.equal(calls, 2);
});

test("publication requires a complete schedule while partial drafts remain valid", () => {
  assert.equal(eventDraftSchema.safeParse({}).success, true);
  const missing = publicationErrors({});
  for (const field of [
    "name",
    "format",
    "timezone",
    "starts_at",
    "ends_at",
    "visibility",
    "summary",
    "description",
  ])
    assert.ok(missing[field], field);
});

test("publication requires the correct venue or virtual link for each format", () => {
  const base = {
    name: "Community",
    timezone: "Africa/Lagos",
    starts_at: "2026-11-01T10:00:00Z",
    ends_at: "2026-11-01T12:00:00Z",
    visibility: "private",
    summary: "Meet the community",
    description: "A gathering for people building useful products.",
  };
  assert.ok(publicationErrors({ ...base, format: "physical" }).venue_address);
  assert.ok(publicationErrors({ ...base, format: "virtual" }).attendance_url);
  assert.equal(
    Object.keys(
      publicationErrors({
        ...base,
        format: "hybrid",
        venue_name: "Hall",
        venue_address: "Lagos",
        attendance_url: "https://example.test/join",
      }),
    ).length,
    0,
  );
  assert.ok(
    publicationErrors({
      ...base,
      format: "virtual",
      attendance_url: "javascript:alert(1)",
    }).attendance_url,
  );
});
test("empty event drafts are valid; unsafe time and link values never autosave", () => {
  assert.equal(eventDraftSchema.safeParse({}).success, true);
  for (const draft of [
    { timezone: "EST" },
    { timezone: "Invalid/Zone" },
    { starts_at: "2026" },
    { starts_at: "" },
    { ends_at: "" },
    { timezone: "" },
    { format: "" },
    { attendance_url: "javascript:alert(1)" },
    { attendance_url: "https://" },
  ])
    assert.equal(eventDraftSchema.safeParse(draft).success, false);
});

test("forward navigation validates the current stage without requiring later optional settings", () => {
  const basics = {
    name: "Community",
    format: "virtual",
    timezone: "Africa/Lagos",
    starts_at: "2026-11-01T10:00:00Z",
    ends_at: "2026-11-01T12:00:00Z",
    attendance_url: "https://example.test/join",
  };
  assert.equal(Object.keys(eventStageErrors(basics, 0)).length, 0);
  assert.ok(eventStageErrors({}, 0).name);
  assert.ok(eventStageErrors(basics, 1).summary);
  assert.ok(eventStageErrors(basics, 1).description);
  assert.equal(
    Object.keys(
      eventStageErrors(
        { ...basics, summary: "Gathering", description: "Meet people" },
        1,
      ),
    ).length,
    0,
  );
  assert.ok(eventStageErrors(basics, 2).visibility);
  assert.equal(
    Object.keys(eventStageErrors({ ...basics, visibility: "private" }, 2))
      .length,
    0,
  );
});
test("invalid settings and backend program errors lead to the correct editable section", () => {
  assert.equal(eventFieldStage("name"), 0);
  assert.equal(eventFieldStage("program"), 1);
  assert.equal(eventFieldStage("networking_closes_at"), 2);
  const errors = eventStageErrors(
    {
      visibility: "public",
      networking_opens_at: "2026-11-01T12:00:00Z",
      networking_closes_at: "2026-11-01T11:00:00Z",
    },
    2,
  );
  assert.ok(errors.networking_closes_at);
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

test("walkthrough steps retain every publication requirement and point errors to their actual draft or published panel", () => {
  const source = ts.transpileModule(
    readFileSync(new URL("../lib/event-setup.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  const setup = { exports: {} };
  vm.runInNewContext(`(function(require,module,exports){${source}\n})`)(
    () => publicationModule.exports,
    setup,
    setup.exports,
  );
  const {
    eventSetupSteps,
    publishedEventSetupSteps,
    eventSetupFieldStep,
    eventSetupStepErrors,
  } = setup.exports;
  assert.equal(eventSetupSteps.length, 6);
  assert.ok(publishedEventSetupSteps.includes("Agenda & lineup"));
  assert.equal(eventSetupFieldStep("program"), 3);
  assert.equal(eventSetupFieldStep("program", true), 4);
  assert.equal(eventSetupFieldStep("networking_closes_at", true), 3);
  assert.equal(eventSetupFieldStep("visibility"), 2);
  assert.equal(eventSetupFieldStep("image_key"), 0);
  for (const published of [false, true]) {
    const draft = {};
    const collected = Object.assign(
      {},
      ...Array.from({ length: published ? 9 : 6 }, (_, index) =>
        eventSetupStepErrors(draft, index, published),
      ),
    );
    assert.deepEqual(
      Object.keys(collected).sort(),
      Object.keys(publicationErrors(draft)).sort(),
    );
    assert.equal(
      Object.keys(eventSetupStepErrors(draft, 1, published)).length,
      0,
    );
    assert.equal(
      eventSetupStepErrors(draft, 2, published).visibility,
      "Complete this field before publishing.",
    );
  }
});
