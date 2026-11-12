import { expect, test, type Page } from "@playwright/test";
import { api, phoneFor, seeded } from "./support";

// Organizer workflows beyond the core journey: business settings, approval-mode
// registration with required questions, event discovery, moderated Q&A and
// announcements. Seeded accounts as in journey.spec.ts.
test.describe.configure({ mode: "serial" });

let organizer: Page;
let applicant: Page; // grace: approved
let declined: Page; // zainab: rejected
let outsider: Page; // emeka: never joins
let eventId = "";
let slug = "";
let questionIds: string[] = [];

test.beforeAll(async ({ browser }) => {
  organizer = await phoneFor(browser, seeded.organizer);
  applicant = await phoneFor(browser, seeded.nonMember);
  declined = await phoneFor(browser, seeded.attendeeA);
  outsider = await phoneFor(browser, seeded.attendeeB);
});

test.afterAll(async () => {
  await Promise.all(
    [organizer, applicant, declined, outsider].map((page) =>
      page?.context().close(),
    ),
  );
});

test("organizer business settings save, and attendees cannot change them", async () => {
  const before = await api(organizer, "GET", "/me/account");
  expect(before.status).toBe(200);
  const original = before.body as Record<string, unknown>;
  const update = {
    full_name: String(original.full_name),
    organization: String(original.organization),
    website: "https://gdg.example.com",
    about: "Community of developers in Lagos.",
    city: "Lagos",
    country_code: "NG",
    timezone: "Africa/Lagos",
  };
  const saved = await api(organizer, "PUT", "/me/account", update);
  expect(saved.status, JSON.stringify(saved.body)).toBe(200);
  const after = await api(organizer, "GET", "/me/account");
  expect((after.body?.business as { website?: string })?.website).toBe(
    "https://gdg.example.com",
  );
  expect(JSON.stringify(after.body)).not.toMatch(/"contact_phone"|"phone"/);
  const attendeeTry = await api(applicant, "PUT", "/me/account", update);
  expect([403, 404, 409]).toContain(attendeeTry.status);
});

test("organizer publishes a review-only event with a required question", async () => {
  const startsAt = new Date(Date.now() + 3 * 24 * 3600 * 1000);
  startsAt.setUTCHours(9, 0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + 6 * 3600 * 1000);
  const name = `Review flow ${new Date().toISOString().slice(0, 16)}`;
  const created = await api(
    organizer,
    "POST",
    "/events",
    {
      name,
      format: "physical",
      timezone: "Africa/Lagos",
      visibility: "public",
      category: "Technology",
      approval_mode: "review",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      summary: "Checks approval, questions, Q&A and announcements.",
      description: "Created by the workflow check.",
      topics: ["Testing"],
      venue_name: "Test Hall",
      venue_address: "1 Test Street, Lagos",
    },
    { "Idempotency-Key": `wf-${name}` },
  );
  expect(created.status, JSON.stringify(created.body)).toBe(201);
  eventId = String(created.body?.id);
  const day = await api(organizer, "POST", `/events/${eventId}/program/days`, {
    date: startsAt.toISOString().slice(0, 10),
  });
  expect(day.status).toBe(201);
  const session = await api(
    organizer,
    "POST",
    `/events/${eventId}/program/days/${String(day.body?.id)}/sessions`,
    {
      title: "Opening",
      description: "Welcome.",
      track: "Main",
      room: "Hall A",
      speakers: [{ name: "Test Host", role: "Host", organization: "Trybe" }],
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 3600 * 1000).toISOString(),
    },
  );
  expect(session.status).toBe(201);
  const questions = await api(
    organizer,
    "PUT",
    `/organizer/events/${eventId}/registration-questions`,
    {
      items: [
        { label: "What do you build?", kind: "short", required: true },
        {
          label: "Track",
          kind: "select",
          options: ["Web", "Mobile"],
          required: false,
        },
      ],
    },
  );
  expect(questions.status, JSON.stringify(questions.body)).toBe(200);
  questionIds = (
    (questions.body?.items ?? []) as { id: string; label: string }[]
  ).map((item) => item.id);
  expect(questionIds).toHaveLength(2);
  const published = await api(organizer, "POST", `/events/${eventId}/publish`);
  expect(published.status, JSON.stringify(published.body)).toBe(200);
  slug = String(published.body?.slug);
  const landing = await api(applicant, "GET", `/e/${slug}`);
  expect(landing.body?.approval_required).toBe(true);
  expect(landing.body?.category).toBe("Technology");
});

test("the new event appears in discovery and the code box opens it", async () => {
  const listed = await api(applicant, "GET", "/discover/events");
  expect(listed.status).toBe(200);
  expect(
    ((listed.body?.items ?? []) as { slug: string }[]).some(
      (event) => event.slug === slug,
    ),
  ).toBe(true);
  await applicant.goto("/attendee/discover");
  await expect(
    applicant.getByRole("heading", { name: "Upcoming and ongoing events" }),
  ).toBeVisible();
  await applicant
    .getByRole("textbox", { name: "Event link or code" })
    .fill(`https://trybe.example/${slug.toUpperCase()}`);
  await applicant.getByRole("button", { name: "Go to event" }).click();
  await expect(applicant).toHaveURL(new RegExp(`/${slug}$`));
});

test("a required question blocks joining until it is answered; the join waits for review", async () => {
  const missing = await api(applicant, "POST", `/e/${slug}/join`, {
    answers: {},
  });
  expect(missing.status).toBe(400);
  const joined = await api(applicant, "POST", `/e/${slug}/join`, {
    answers: { [questionIds[0] ?? ""]: "Mobile learning apps" },
  });
  expect(joined.status, JSON.stringify(joined.body)).toBe(200);
  expect(joined.body?.status).toBe("pending");
  const rejectedJoin = await api(declined, "POST", `/e/${slug}/join`, {
    answers: { [questionIds[0] ?? ""]: "Dashboards" },
  });
  expect(rejectedJoin.body?.status).toBe("pending");
  // Pending registrations cannot see who else is there.
  const directory = await api(applicant, "GET", `/events/${eventId}/attendees`);
  expect([403, 404]).toContain(directory.status);
});

test("the organizer approves one registration and rejects another", async () => {
  const list = await api(
    organizer,
    "GET",
    `/organizer/registrations?event_id=${eventId}`,
  );
  expect(list.status).toBe(200);
  const items = (list.body?.items ?? []) as {
    id: string;
    attendee_name: string;
    status: string;
    answers: { question: string; value: string[] }[];
  }[];
  const grace = items.find((item) => item.attendee_name === "Grace Etim");
  const zainab = items.find((item) => item.attendee_name === "Zainab Musa");
  expect(grace?.status).toBe("pending");
  expect(JSON.stringify(grace?.answers)).toContain("Mobile learning apps");
  const approve = await api(
    organizer,
    "POST",
    `/organizer/registrations/${grace?.id}/decision`,
    { decision: "approve" },
  );
  expect(approve.status, JSON.stringify(approve.body)).toBe(200);
  const reject = await api(
    organizer,
    "POST",
    `/organizer/registrations/${zainab?.id}/decision`,
    { decision: "reject" },
  );
  expect(reject.status, JSON.stringify(reject.body)).toBe(200);
  const attendees = await api(applicant, "GET", `/events/${eventId}/attendees`);
  expect(attendees.status).toBe(200);
  const blocked = await api(declined, "GET", `/events/${eventId}/attendees`);
  expect([403, 404]).toContain(blocked.status);
  const attempt = await api(
    organizer,
    "POST",
    `/organizer/registrations/${grace?.id}/decision`,
    { decision: "approve" },
  );
  expect([200, 409]).toContain(attempt.status);
});

test("members ask questions; the organizer moderates and answers anonymously", async () => {
  const asked = await api(applicant, "POST", `/events/${eventId}/questions`, {
    body: "Will the slides be shared?",
  });
  expect([200, 201]).toContain(asked.status);
  const questionId = String(asked.body?.id);
  const outsiderAsk = await api(
    outsider,
    "POST",
    `/events/${eventId}/questions`,
    {
      body: "Can I ask without joining?",
    },
  );
  expect([403, 404]).toContain(outsiderAsk.status);
  const queue = await api(
    organizer,
    "GET",
    `/organizer/events/${eventId}/questions`,
  );
  const entry = (
    (queue.body?.items ?? []) as { id: string; author_name?: string }[]
  ).find((item) => item.id === questionId);
  expect(entry?.author_name).toBeTruthy();
  const moderated = await api(
    organizer,
    "POST",
    `/organizer/questions/${questionId}`,
    {
      status: "published",
      answer: "Yes, after the event.",
    },
  );
  expect(moderated.status, JSON.stringify(moderated.body)).toBe(200);
  const visible = await api(applicant, "GET", `/events/${eventId}/questions`);
  const mine = (
    (visible.body?.items ?? []) as {
      id: string;
      answer: string | null;
      author_name?: string;
    }[]
  ).find((item) => item.id === questionId);
  expect(mine?.answer).toBe("Yes, after the event.");
  expect(mine?.author_name).toBeUndefined();
});

test("announcements reach admitted members only", async () => {
  const posted = await api(
    organizer,
    "POST",
    `/organizer/events/${eventId}/announcements`,
    { title: "Doors open at 8:30", body: "Bring a photo ID." },
  );
  expect([200, 201]).toContain(posted.status);
  const seen = await api(applicant, "GET", `/events/${eventId}/announcements`);
  expect(seen.status).toBe(200);
  expect(JSON.stringify(seen.body)).toContain("Doors open at 8:30");
  for (const page of [declined, outsider]) {
    const denied = await api(page, "GET", `/events/${eventId}/announcements`);
    expect([403, 404]).toContain(denied.status);
  }
  await applicant.goto(`/events/${slug}/updates`);
  await expect(applicant.getByText("Doors open at 8:30")).toBeVisible();
});
