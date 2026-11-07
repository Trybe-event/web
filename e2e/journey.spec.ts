import { expect, test, type Page } from "@playwright/test";
import {
  api,
  attendeeId,
  names,
  phoneFor,
  publishEvent,
  seeded,
} from "./support";

// The MVP launch gate on phones (PRD §30, §32; MVP M4): an organizer publishes,
// two attendees join on the invitation link, discover each other, connect by
// mutual consent and chat live. Then the negative paths the gate depends on.
test.describe.configure({ mode: "serial" });

let slug = "";
let eventId = "";
let organizer: Page;
let attendeeA: Page;
let attendeeB: Page;
let nonMember: Page;
let attendeeAId = "";
let attendeeBId = "";

test.beforeAll(async ({ browser }) => {
  organizer = await phoneFor(browser, seeded.organizer);
  attendeeA = await phoneFor(browser, seeded.attendeeA);
  attendeeB = await phoneFor(browser, seeded.attendeeB);
  nonMember = await phoneFor(browser, seeded.nonMember);
  attendeeAId = await attendeeId(attendeeA);
  attendeeBId = await attendeeId(attendeeB);
  // Leftovers from an interrupted run would change what the journey sees.
  await api(attendeeA, "DELETE", `/blocks/${attendeeBId}`);
  await api(attendeeB, "DELETE", `/blocks/${attendeeAId}`);
  for (const page of [attendeeA, attendeeB]) {
    const connections = await api(page, "GET", "/me/connections");
    for (const connection of (connections.body?.items ?? []) as {
      id: string;
      other: { attendee_id: string };
    }[]) {
      if ([attendeeAId, attendeeBId].includes(connection.other.attendee_id))
        await api(page, "DELETE", `/connections/${connection.id}`);
    }
  }
});

test.afterAll(async () => {
  await api(attendeeA, "DELETE", `/blocks/${attendeeBId}`);
  await Promise.all(
    [organizer, attendeeA, attendeeB, nonMember].map((page) =>
      page?.context().close(),
    ),
  );
});

test("organizer publishes an event with a permanent invitation link", async () => {
  ({ slug, eventId } = await publishEvent(
    organizer,
    `Pilot journey ${new Date().toISOString().slice(0, 16)}`,
  ));
  expect(slug).toMatch(/^[a-z0-9]{6}$/);
  await organizer.goto("/organizer");
  await expect(organizer.getByText(/Pilot journey/).first()).toBeVisible();
});

async function joinOnLink(page: Page) {
  await page.goto(`/${slug}`);
  await page
    .getByRole("button", { name: /join|confirm and join/i })
    .first()
    .click();
  const confirm = page.getByRole("button", { name: "Confirm and join" });
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
  await expect(
    page
      .getByRole("link", { name: "Open your event workspace" })
      .or(page.getByRole("navigation", { name: "Event workspace" })),
  ).toBeVisible();
}

test("attendees join on the invitation link after confirming", async () => {
  await joinOnLink(attendeeA);
  await joinOnLink(attendeeB);
  const mine = await api(attendeeA, "GET", "/me/events");
  expect(
    (mine.body?.items as { event: { slug: string } }[]).some(
      (item) => item.event.slug === slug,
    ),
  ).toBe(true);
});

test("attendee A discovers B in the event directory and asks to connect", async () => {
  await attendeeA.goto(`/events/${slug}/attendees`);
  const card = attendeeA
    .locator("article, li, div")
    .filter({ hasText: names.emeka })
    .filter({ has: attendeeA.getByRole("link", { name: "View profile" }) })
    .last();
  await card.getByRole("link", { name: "View profile" }).click();
  await expect(
    attendeeA.getByRole("heading", { name: names.emeka }),
  ).toBeVisible();
  await attendeeA
    .getByLabel("A short introduction")
    .fill("Hi Emeka, great to meet you here.");
  await attendeeA
    .getByRole("button", { name: "Send connection request" })
    .click();
  await expect(attendeeA.getByText("Request sent")).toBeVisible();
});

test("attendee B accepts and opens the conversation", async () => {
  await attendeeB.goto("/attendee/connections");
  await attendeeB.getByRole("button", { name: "Accept" }).first().click();
  await attendeeB.getByRole("tab", { name: /Connected/ }).click();
  await attendeeB
    .getByRole("button", { name: `Message ${names.zainab}` })
    .click();
  await expect(attendeeB).toHaveURL(/\/attendee\/inbox\/[0-9a-f-]+$/);
});

test("they exchange messages live", async () => {
  const hello = `Hello from Emeka ${Date.now()}`;
  await attendeeB.getByRole("textbox", { name: "Message" }).fill(hello);
  await attendeeB.getByRole("button", { name: "Send", exact: true }).click();
  await expect(attendeeB.getByText(hello)).toBeVisible();

  await attendeeA.goto("/attendee/inbox");
  await attendeeA.getByRole("link", { name: new RegExp(names.emeka) }).click();
  await expect(attendeeA.getByText(hello)).toBeVisible();

  const reply = `Reply from Zainab ${Date.now()}`;
  await attendeeA.getByRole("textbox", { name: "Message" }).fill(reply);
  await attendeeA.getByRole("textbox", { name: "Message" }).press("Enter");
  // B never reloads: the reply arrives over the live connection (or its poll).
  await expect(attendeeB.getByText(reply)).toBeVisible({ timeout: 30_000 });
});

test("an organizer account cannot join an event", async () => {
  await organizer.goto(`/${slug}`);
  await expect(
    organizer.getByText("Organizer accounts don't join events.", {
      exact: false,
    }),
  ).toBeVisible();
  const attempt = await api(organizer, "POST", `/e/${slug}/join`);
  expect(attempt.status).toBe(403);
});

test("a non-member cannot open the event directory", async () => {
  const response = await nonMember.goto(`/events/${slug}/attendees`);
  expect(response?.status()).toBe(404);
  const raw = await api(nonMember, "GET", `/events/${eventId}/attendees`);
  expect([403, 404]).toContain(raw.status);
  expect(JSON.stringify(raw.body)).not.toContain(names.zainab);
});

test("a blocked attendee cannot message", async () => {
  // A blocks B from the conversation they share.
  await attendeeA.getByRole("button", { name: "Block" }).click();
  await attendeeA
    .getByRole("dialog")
    .getByRole("button", { name: /^Block/ })
    .click();
  await expect(
    attendeeA.getByRole("textbox", { name: "Message" }),
  ).toBeDisabled();

  // The blocked side gets no usable composer: disabled, or not rendered at all.
  await attendeeB.reload();
  await expect(attendeeB.getByRole("heading").first()).toBeVisible();
  const composer = attendeeB.getByRole("textbox", { name: "Message" });
  expect((await composer.count()) === 0 || (await composer.isDisabled())).toBe(
    true,
  );
  // And the server refuses a send outright, whatever the page shows.
  const conversationId = new URL(attendeeB.url()).pathname.split("/").pop();
  const attempt = await api(
    attendeeB,
    "POST",
    `/conversations/${conversationId}/messages`,
    { body: "This must not be delivered." },
  );
  expect([403, 404, 409]).toContain(attempt.status);
});
