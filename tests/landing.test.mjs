import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Values built inside the vm context have that context's prototypes, so compare
// plain copies of them rather than the objects themselves.
const plain = (value) => structuredClone(value);

const compile = (path) =>
  ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;

function runModule(compiled, dependencies = {}) {
  const compiledModule = { exports: {} };
  const execute = vm.runInNewContext(
    `(function(require,module,exports){${compiled}\n})`,
    { Intl, Date },
  );
  execute(
    (name) => {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    compiledModule,
    compiledModule.exports,
  );
  return compiledModule.exports;
}

// The real lib/event-landing.ts against the real web#10 link-state copy, so the
// banner cannot drift from the screens it quotes.
const linkStates = runModule(compile("../lib/registration/link-states.ts"));
const landing = runModule(compile("../lib/event-landing.ts"), {
  "./registration/link-states": linkStates,
});

const speaker = (name, extra = {}) => ({
  name,
  role: null,
  organization: null,
  bio: null,
  ...extra,
});

const session = (id, position, title, starts_at, ends_at, extra = {}) => ({
  id,
  day_id: "d1",
  position,
  title,
  starts_at,
  ends_at,
  room: null,
  track: null,
  speakers: [],
  overlaps_with: [],
  ...extra,
});

test("the registration banner states availability and quotes web#10's copy", () => {
  const open = plain(landing.registrationBanner("open"));
  assert.equal(open.tone, "success");
  assert.equal(open.title, "Registration is open.");
  assert.equal(open.body, null);
  assert.equal(open.action, null, "an open window joins below, not here");

  const notOpen = plain(landing.registrationBanner("not_open"));
  assert.equal(notOpen.tone, "neutral");
  assert.deepEqual(notOpen.action, {
    label: "Set up your profile",
    href: "/attendee",
  });
  const closed = plain(landing.registrationBanner("closed"));
  assert.deepEqual(closed.action, { label: "Explore Trybe", href: "/" });

  // The banner never invents copy: it is the same text the state screens show.
  for (const state of ["not_open", "closed"]) {
    const screen = linkStates.eventLinkScreen({
      kind: "published",
      registrationState: state,
    });
    const banner = plain(landing.registrationBanner(state));
    assert.equal(banner.title, screen.title);
    assert.equal(banner.body, screen.body);
  }
});

test("only an open registration window offers a join", () => {
  assert.equal(landing.acceptsRegistrations("open"), true);
  assert.equal(landing.acceptsRegistrations("not_open"), false);
  assert.equal(landing.acceptsRegistrations("closed"), false);
  // No event loaded (the app runs without keys): the links still stand.
  assert.equal(landing.acceptsRegistrations(null), true);
});

test("each visitor gets the right landing action and only open registration offers one", () => {
  const base = { member: false, preview: "unavailable" };

  // Organizer sessions are told why, and never get a join, in any window.
  for (const registrationOpen of [true, false])
    assert.equal(
      landing.landingAction({
        ...base,
        session: "organizer",
        registrationOpen,
      }),
      "organizer_note",
    );

  // A member keeps their workspace even once registration has closed.
  assert.equal(
    landing.landingAction({
      ...base,
      session: "attendee",
      member: true,
      registrationOpen: false,
    }),
    "workspace",
  );

  // Closed or not-open registration: nothing to press for anyone else either,
  // even when a review would otherwise be waiting.
  assert.equal(
    landing.landingAction({
      ...base,
      session: "attendee",
      registrationOpen: false,
      preview: "review",
    }),
    "none",
  );
  assert.equal(
    landing.landingAction({
      ...base,
      session: "signed-out",
      registrationOpen: false,
    }),
    "none",
  );

  // While open, each preview reason maps to its own screen.
  assert.equal(
    landing.landingAction({
      ...base,
      session: "attendee",
      registrationOpen: true,
      preview: "review",
    }),
    "review",
  );
  assert.equal(
    landing.landingAction({
      ...base,
      session: "attendee",
      registrationOpen: true,
      preview: "needs_profile",
    }),
    "create_profile",
  );
  assert.equal(
    landing.landingAction({
      ...base,
      session: "attendee",
      registrationOpen: true,
      preview: "unavailable",
    }),
    "join",
  );
  assert.equal(
    landing.landingAction({
      ...base,
      session: "signed-out",
      registrationOpen: true,
    }),
    "register",
  );
  assert.equal(
    landing.landingAction({
      ...base,
      session: "unconfigured",
      registrationOpen: true,
    }),
    "register",
  );
});

test("the program is grouped by day in the event's own timezone", () => {
  const event = {
    timezone: "Africa/Lagos",
    program: {
      days: [
        // Deliberately out of order: position decides the page, not the array.
        {
          id: "d2",
          date: "2026-11-02",
          title: null,
          position: 2,
          sessions: [],
        },
        {
          id: "d1",
          date: "2026-11-01",
          title: null,
          position: 1,
          sessions: [
            session(
              "s2",
              2,
              "Closing",
              "2026-11-01T15:00:00Z",
              "2026-11-01T16:00:00Z",
            ),
            session(
              "s1",
              1,
              "Opening",
              "2026-11-01T12:00:00Z",
              "2026-11-01T13:00:00Z",
              {
                track: "Main",
                room: "Hall A",
                speakers: [
                  speaker("Ada Lovelace", { role: "Engineer" }),
                  speaker("Grace Hopper"),
                ],
              },
            ),
          ],
        },
      ],
    },
  };

  const days = plain(landing.landingProgram(event));
  assert.deepEqual(
    days.map((day) => day.label),
    ["Sunday, 1 November 2026", "Monday, 2 November 2026"],
  );
  const [firstDay] = days;
  assert.deepEqual(
    firstDay.sessions.map((item) => item.title),
    ["Opening", "Closing"],
    "sessions follow their position too",
  );
  const opening = firstDay.sessions[0];
  assert.equal(opening.time, "13:00–14:00", "12:00Z is 13:00 in Lagos");
  assert.equal(opening.track, "Main");
  assert.equal(opening.room, "Hall A");
  assert.deepEqual(opening.speakerNames, ["Ada Lovelace", "Grace Hopper"]);
});

test("a calendar day never moves with the event's timezone", () => {
  // UTC midnight of 1 November in Los Angeles is still 1 November for people
  // reading the program: the label comes from the calendar value, not an instant.
  const event = {
    timezone: "America/Los_Angeles",
    program: {
      days: [
        {
          id: "d1",
          date: "2026-11-01",
          title: null,
          position: 1,
          sessions: [],
        },
      ],
    },
  };
  assert.equal(
    plain(landing.landingProgram(event))[0].label,
    "Sunday, 1 November 2026",
  );

  // An organizer's own day title wins over the computed label.
  const titled = {
    timezone: "UTC",
    program: {
      days: [
        {
          id: "d1",
          date: "2026-11-01",
          title: "Workshop day",
          position: 1,
          sessions: [],
        },
      ],
    },
  };
  assert.equal(plain(landing.landingProgram(titled))[0].label, "Workshop day");
});

test("the schedule line reads in the event's timezone", () => {
  assert.equal(
    landing.scheduleLine({
      starts_at: "2026-11-01T09:00:00Z",
      ends_at: "2026-11-01T17:00:00Z",
      timezone: "UTC",
    }),
    "Sunday, 1 November 2026 · 09:00–17:00 (UTC)",
  );
  // 30 Oct 23:30Z opens 31 Oct in Lagos, so a multi-day event shows both of
  // its own days rather than one UTC day.
  assert.equal(
    landing.scheduleLine({
      starts_at: "2026-10-30T23:30:00Z",
      ends_at: "2026-11-03T06:00:00Z",
      timezone: "Africa/Lagos",
    }),
    "Saturday, 31 October 2026 – Tuesday, 3 November 2026 (Africa/Lagos)",
  );
  // A timezone the API should never send cannot break the page.
  assert.equal(
    landing.timeRange(
      "2026-11-01T09:00:00Z",
      "2026-11-01T10:30:00Z",
      "Mars/Olympus_Mons",
    ),
    "09:00–10:30",
  );
});

test("a speaker who talks twice appears once", () => {
  const event = {
    timezone: "UTC",
    program: {
      days: [
        {
          id: "d1",
          date: "2026-11-01",
          title: null,
          position: 1,
          sessions: [
            session(
              "s1",
              1,
              "One",
              "2026-11-01T09:00:00Z",
              "2026-11-01T10:00:00Z",
              {
                speakers: [
                  speaker("Ada Lovelace", {
                    organization: "Trybe",
                    bio: "First bio wins.",
                  }),
                ],
              },
            ),
            session(
              "s2",
              2,
              "Two",
              "2026-11-01T11:00:00Z",
              "2026-11-01T12:00:00Z",
              {
                speakers: [
                  speaker("Ada Lovelace", {
                    organization: "Trybe",
                    bio: "Later bio is ignored.",
                  }),
                  // Same name at another organization is a different speaker.
                  speaker("Ada Lovelace", { organization: "Elsewhere" }),
                  speaker("   ", {}),
                ],
              },
            ),
          ],
        },
      ],
    },
  };
  const speakers = plain(landing.landingSpeakers(event));
  assert.equal(speakers.length, 2, "blank names never become speakers");
  assert.equal(speakers[0].bio, "First bio wins.");
  assert.equal(speakers[1].organization, "Elsewhere");
});

test("link previews carry the event, and never claim data that isn't there", () => {
  const event = {
    name: "Atlas Summit",
    summary: "Two days of code.",
    description: "A longer description.",
    image_url: "https://cdn.example/og.png",
  };
  const meta = plain(landing.landingMetadata(event, "atlas-summit"));
  assert.equal(meta.title, "Atlas Summit");
  assert.equal(meta.description, "Two days of code.");
  assert.equal(meta.alternates.canonical, "/atlas-summit");
  assert.equal(meta.openGraph.url, "/atlas-summit");
  assert.equal(meta.openGraph.images[0].url, "https://cdn.example/og.png");

  // No summary falls back to the description, trimmed to a preview length.
  const long = plain(
    landing.landingMetadata(
      { ...event, summary: "", image_url: null, description: "x".repeat(500) },
      "atlas-summit",
    ),
  );
  assert.equal(long.description.length, 300);
  assert.equal(long.openGraph.images, undefined);

  // A page without event data keeps the generic title.
  assert.equal(landing.landingMetadata(null, "atlas-summit").title, "Event");
});

test("the description renders as paragraphs, not one wall of text", () => {
  assert.deepEqual(
    plain(landing.descriptionParagraphs("First.\n\nSecond.\n\n\n  Third.  \n")),
    ["First.", "Second.", "Third."],
  );
  assert.deepEqual(plain(landing.descriptionParagraphs("   \n\n  ")), []);
});
