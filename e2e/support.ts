import { clerk } from "@clerk/testing/playwright";
import { devices, expect, type Browser, type Page } from "@playwright/test";

const baseURL = process.env.TRYBE_E2E_WEB_URL ?? "http://localhost:3000";

// Each person in a journey gets their own phone: a separate browser context,
// so sessions never mix.
export async function phoneFor(browser: Browser, key: string) {
  const context = await browser.newContext({
    ...devices["Pixel 7"],
    viewport: { width: 360, height: 780 },
    baseURL,
  });
  const page = await context.newPage();
  await signIn(page, key);
  return page;
}

// Seeded accounts (api cmd/seed --clerk) sign in with Clerk sign-in tokens, so
// the suite never needs their password and never types one into a page.
export const seeded = {
  organizer: "org-ada",
  attendeeA: "zainab",
  attendeeB: "emeka",
  nonMember: "grace",
} as const;

export const names = {
  zainab: "Zainab Musa",
  emeka: "Emeka Nnamdi",
} as const;

export function seededEmail(key: string) {
  return `${key}+clerk_test@example.com`;
}

export async function signIn(page: Page, key: string) {
  await page.goto("/");
  await clerk.signIn({ page, emailAddress: seededEmail(key) });
}

type ApiResult = { status: number; body: Record<string, unknown> | null };

// Calls the API through the web app's own /api proxy with the page's session,
// exactly as the browser does. Used for setup and cleanup, never for the steps
// a test is checking.
export async function api(
  page: Page,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<ApiResult> {
  const response = await page.request.fetch(`/api${path}`, {
    method,
    data: body === undefined ? undefined : JSON.stringify(body),
    // The proxy refuses writes without the app's own Origin, as a browser sends.
    headers: {
      "Content-Type": "application/json",
      Origin: new URL(baseURL).origin,
      ...headers,
    },
  });
  const text = await response.text();
  return {
    status: response.status(),
    body: text ? (JSON.parse(text) as Record<string, unknown>) : null,
  };
}

// The organizer creates and publishes a small event through the same API the
// event form uses, and gets back its permanent invitation code.
export async function publishEvent(page: Page, name: string) {
  const startsAt = new Date(Date.now() + 2 * 24 * 3600 * 1000);
  startsAt.setUTCHours(9, 0, 0, 0);
  const endsAt = new Date(startsAt.getTime() + 8 * 3600 * 1000);
  const created = await api(
    page,
    "POST",
    "/events",
    {
      name,
      format: "physical",
      timezone: "Africa/Lagos",
      visibility: "public",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      summary: "End-to-end pilot journey check.",
      description: "Created by the automated pilot journey (web#22).",
      topics: ["Testing"],
      venue_name: "Test Hall",
      venue_address: "1 Test Street, Lagos",
    },
    { "Idempotency-Key": `e2e-${name}` },
  );
  expect(created.status, JSON.stringify(created.body)).toBe(201);
  const eventId = String(created.body?.id);
  const day = await api(page, "POST", `/events/${eventId}/program/days`, {
    date: startsAt.toISOString().slice(0, 10),
  });
  expect(day.status, JSON.stringify(day.body)).toBe(201);
  const session = await api(
    page,
    "POST",
    `/events/${eventId}/program/days/${String(day.body?.id)}/sessions`,
    {
      title: "Opening",
      description: "Welcome and introductions.",
      track: "Main",
      room: "Hall A",
      speakers: [{ name: "Test Host", role: "Host", organization: "Trybe" }],
      starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + 3600 * 1000).toISOString(),
    },
  );
  expect(session.status, JSON.stringify(session.body)).toBe(201);
  const published = await api(page, "POST", `/events/${eventId}/publish`);
  expect(published.status, JSON.stringify(published.body)).toBe(200);
  return { eventId, slug: String(published.body?.slug) };
}

export async function attendeeId(page: Page) {
  const account = await api(page, "GET", "/me/account");
  expect(account.status, JSON.stringify(account.body)).toBe(200);
  return String(account.body?.id);
}
