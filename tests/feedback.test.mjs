// Unit tests for the relevance prompt rules (web#28), run with node --test. The pure
// module lib/feedback.ts holds the rules the acceptance criteria care about: when the
// prompt is earned, that it is offered at most once per event, and that only a body
// the contract accepts reaches POST /feedback.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Some Node builds ship without TypeScript support, so transpile the real module the
// same way tests/inbox.test.mjs does. Its only import is type-only, which means it
// needs no dependencies once compiled.
function feedbackModule() {
  const source = readFileSync(
    new URL("../lib/feedback.ts", import.meta.url),
    "utf8",
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const compiledModule = { exports: {} };
  const run = vm.runInNewContext(
    `(function(require,module,exports){${compiled}\n})`,
    {},
  );
  run(
    (name) => {
      throw new Error(`Unexpected dependency: ${name}`);
    },
    compiledModule,
    compiledModule.exports,
  );
  return compiledModule.exports;
}

// Values built inside the vm context have that context's prototypes, so compare plain
// copies of them rather than the objects themselves.
const plain = (value) => structuredClone(value);

const {
  FEEDBACK_STORAGE_KEY,
  MAX_COMMENT_LENGTH,
  RELEVANCE_CHOICES,
  feedbackProblem,
  feedbackSubmission,
  nextFeedbackCandidate,
  parseDecisions,
  rankFeedbackCandidates,
  recordDecision,
} = feedbackModule();

const membership = (id, networkingState, endsAt = "2026-10-15T18:00:00Z") => ({
  event: {
    id,
    slug: id,
    name: `Event ${id}`,
    format: "physical",
    timezone: "Africa/Lagos",
    starts_at: "2026-10-15T09:00:00Z",
    ends_at: endsAt,
    status: "published",
    registration_state: "open",
    networking_state: networkingState,
  },
  membership: {
    event_id: id,
    status: "active",
    joined_at: "2026-10-01T09:00:00Z",
  },
});

const connection = (eventId, connectedAt, id = `connection-${eventId}`) => ({
  id,
  origin_event_id: eventId,
  connected_at: connectedAt,
  other: { attendee_id: "attendee-1", full_name: "Tomi Ade" },
});

test("a first accepted connection earns the prompt for its event", () => {
  const candidates = rankFeedbackCandidates(
    [membership("atlas", "open")],
    [connection("atlas", "2026-10-16T09:00:00Z")],
  );
  assert.deepEqual(plain(candidates), [
    {
      eventId: "atlas",
      eventName: "Event atlas",
      trigger: "connection",
      triggeredAt: "2026-10-16T09:00:00Z",
    },
  ]);
});

test("networking close earns the prompt even without a connection", () => {
  const candidates = rankFeedbackCandidates(
    [
      membership("closed", "closed"),
      membership("open", "open"),
      membership("waiting", "not_open"),
    ],
    [],
  );
  assert.deepEqual(
    plain(candidates).map(({ eventId, trigger }) => ({ eventId, trigger })),
    [{ eventId: "closed", trigger: "networking_closed" }],
  );
});

test("an event is offered once even when both triggers apply", () => {
  const candidates = rankFeedbackCandidates(
    [membership("atlas", "closed")],
    [
      connection("atlas", "2026-10-16T09:00:00Z", "older"),
      connection("atlas", "2026-10-16T11:00:00Z", "newer"),
    ],
  );
  assert.equal(candidates.length, 1, "one prompt per event");
  assert.equal(candidates[0].trigger, "connection");
  assert.equal(
    candidates[0].triggeredAt,
    "2026-10-16T11:00:00Z",
    "the latest acceptance sets the order",
  );
});

test("events the attendee left are never offered", () => {
  const left = {
    ...membership("left-event", "closed"),
    membership: {
      event_id: "left-event",
      status: "left",
      joined_at: "2026-10-01T09:00:00Z",
    },
  };
  const removed = {
    ...membership("removed-event", "closed"),
    membership: {
      event_id: "removed-event",
      status: "removed",
      joined_at: "2026-10-01T09:00:00Z",
    },
  };
  const candidates = rankFeedbackCandidates(
    [left, removed],
    [connection("left-event", "2026-10-16T09:00:00Z")],
  );
  assert.deepEqual(plain(candidates), []);
});

test("the newest trigger is offered first", () => {
  const candidates = rankFeedbackCandidates(
    [
      membership("old-connection", "open"),
      membership("new-connection", "open"),
      membership("closed", "closed", "2026-10-18T18:00:00Z"),
    ],
    [
      connection("old-connection", "2026-10-16T09:00:00Z"),
      connection("new-connection", "2026-10-17T09:00:00Z"),
    ],
  );
  assert.deepEqual(
    plain(candidates).map((candidate) => candidate.eventId),
    ["closed", "new-connection", "old-connection"],
  );
});

test("an answered or dismissed event never prompts again", () => {
  const candidates = plain(
    rankFeedbackCandidates(
      [membership("first", "closed"), membership("second", "closed")],
      [],
    ),
  );
  assert.equal(nextFeedbackCandidate(candidates, {}).eventId, "first");
  assert.equal(
    nextFeedbackCandidate(candidates, { first: "dismissed" }).eventId,
    "second",
  );
  assert.equal(
    nextFeedbackCandidate(candidates, {
      first: "dismissed",
      second: "submitted",
    }),
    null,
    "nothing is left to ask",
  );
});

test("decisions survive storage that is empty, broken or foreign", () => {
  assert.deepEqual(plain(parseDecisions(null)), {});
  assert.deepEqual(plain(parseDecisions("")), {});
  assert.deepEqual(plain(parseDecisions("not json")), {});
  assert.deepEqual(plain(parseDecisions('["atlas"]')), {});
  assert.deepEqual(
    plain(parseDecisions('{"atlas":"submitted","harbour":"maybe"}')),
    { atlas: "submitted" },
    "an unknown decision is ignored, not trusted",
  );
  assert.equal(
    recordDecision("not json", "atlas", "dismissed"),
    JSON.stringify({ atlas: "dismissed" }),
  );
  assert.equal(
    recordDecision('{"atlas":"dismissed"}', "harbour", "submitted"),
    JSON.stringify({ atlas: "dismissed", harbour: "submitted" }),
    "a new decision keeps the earlier ones",
  );
  assert.equal(
    recordDecision('{"atlas":"dismissed"}', "atlas", "submitted"),
    JSON.stringify({ atlas: "submitted" }),
  );
  assert.equal(FEEDBACK_STORAGE_KEY, "trybe.feedback.v1");
});

test("only whole scores from 1 to 5 are accepted", () => {
  for (const score of RELEVANCE_CHOICES.map((choice) => choice.score)) {
    assert.equal(feedbackProblem(score, ""), null, `score ${score}`);
  }
  for (const score of [
    null,
    0,
    6,
    -1,
    2.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
  ]) {
    assert.equal(
      feedbackProblem(score, ""),
      "Choose a relevance score from 1 to 5.",
      `score ${score}`,
    );
  }
});

test("a comment longer than the contract allows is refused", () => {
  assert.equal(MAX_COMMENT_LENGTH, 1000);
  assert.equal(feedbackProblem(5, "a".repeat(1000)), null);
  assert.equal(
    feedbackProblem(5, "a".repeat(1001)),
    "Keep your comment to 1,000 characters or fewer.",
  );
});

test("the submission trims the comment and omits a blank one", () => {
  assert.deepEqual(
    plain(feedbackSubmission("atlas", 4, "  Great mix of people.  ")),
    { event_id: "atlas", relevance: 4, comment: "Great mix of people." },
  );
  assert.deepEqual(plain(feedbackSubmission("atlas", 5, "   ")), {
    event_id: "atlas",
    relevance: 5,
  });
});
