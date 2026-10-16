// Mock Service Worker handlers built from the API contract. They let screens be built before the backend
// lands. Each feature issue adds handlers for its endpoints; keep shapes identical to
// contract/openapi.yaml (the types below enforce it).
import { http, HttpResponse } from "msw";

import type { components } from "@/lib/api/schema";

import { MOCK_MY_EVENTS, MOCK_PUBLIC_EVENTS } from "./fixtures";

type ApiSchemas = components["schemas"];

const now = () => new Date().toISOString();

// MSW types a path parameter as string | string[] | undefined.
const slugParam = (value: string | readonly string[] | undefined) =>
  typeof value === "string" ? value : (value?.[0] ?? "");

// Membership state for the join flow (web#7). The fixture events start joined, and the
// join and leave handlers keep the event switcher's list in step with them.
const joined = new Set(MOCK_MY_EVENTS.map((item) => item.event.slug));
const joinedEvents = () =>
  MOCK_MY_EVENTS.filter((item) => joined.has(item.event.slug));

let profile: ApiSchemas["OwnProfile"] | null = null;
let privacy: ApiSchemas["PrivacySettings"] = {
  accepting_requests: true,
  ai_matching_opt_out: false,
};

// A published demo event so organizer screens (web#5 share panel) can be built
// before the backend lands. registration_url is what the QR encodes.
const demoEvent: ApiSchemas["Event"] = {
  name: "Lagos Product Summit 2026",
  slug: "lagos-product-summit-2026",
  registration_url: "/e/lagos-product-summit-2026",
  status: "published",
  registration_state: "open",
  networking_state: "open",
  id: "f2d1a2a4-0f0e-4c1d-9d3a-5a5f3f6b7c01",
  created_at: now(),
  updated_at: now(),
};

const notFound = (message: string) =>
  HttpResponse.json<ApiSchemas["Error"]>(
    { code: "not_found", message },
    { status: 404 },
  );

// profileAs builds the profile one kind of viewer receives, with visibility applied the
// same way the API does.
function profileAs(
  as: "event_member" | "connection",
): ApiSchemas["Profile"] | null {
  if (!profile) return null;
  const allowed =
    as === "connection" ? ["connections", "event_members"] : ["event_members"];
  return {
    attendee_id: profile.attendee_id,
    full_name: profile.full_name,
    role: profile.role,
    bio: profile.bio,
    ...(profile.organization ? { organization: profile.organization } : {}),
    ...(profile.goals ? { goals: profile.goals } : {}),
    skills: profile.skills,
    interests: profile.interests,
    links: (profile.links ?? [])
      .filter((l) => allowed.includes(l.visibility))
      .map(({ kind, value }) => ({ kind, value })),
    accepting_requests: privacy.accepting_requests,
    relationship: as === "connection" ? "connected" : "none",
  };
}

export const apiMockHandlers = [
  http.get("/api/me/profile", () =>
    profile
      ? HttpResponse.json(profile)
      : notFound("You haven't created your profile yet."),
  ),

  http.put("/api/me/profile", async ({ request }) => {
    const body = (await request.json()) as ApiSchemas["ProfileInput"];
    profile = {
      ...body,
      links: body.links ?? [],
      attendee_id: crypto.randomUUID(),
      photo_url: null,
      updated_at: now(),
    };
    return HttpResponse.json(profile);
  }),

  http.get("/api/me/profile/preview", ({ request }) => {
    const as = new URL(request.url).searchParams.get("as");
    const view = profileAs(as === "connection" ? "connection" : "event_member");
    if (!view) return notFound("You haven't created your profile yet.");
    return HttpResponse.json(view);
  }),

  // Active memberships for the event switcher (web#9).
  http.get("/api/me/events", () =>
    HttpResponse.json({ items: joinedEvents() }),
  ),

  // The public event landing page (web#6).
  http.get("/api/e/:slug", ({ params }) => {
    const event = MOCK_PUBLIC_EVENTS.find(
      (candidate) => candidate.slug === slugParam(params.slug),
    );
    return event
      ? HttpResponse.json(event)
      : notFound("No published event has that link.");
  }),

  // The caller's join state, so the landing page offers the workspace instead of the
  // join button once they are in (web#7).
  http.get("/api/e/:slug/join-preview", ({ params }) => {
    const view = profileAs("event_member");
    if (!view) return notFound("You haven't created your profile yet.");
    return HttpResponse.json({
      profile,
      as_event_member: view,
      already_member: joined.has(slugParam(params.slug)),
    });
  }),

  http.post("/api/e/:slug/join", ({ params }) => {
    const slug = slugParam(params.slug);
    const event = MOCK_PUBLIC_EVENTS.find(
      (candidate) => candidate.slug === slug,
    );
    if (!event) return notFound("No published event has that link.");
    joined.add(slug);
    const membership: ApiSchemas["Membership"] = {
      event_id: event.id,
      status: "active",
      joined_at: now(),
    };
    return HttpResponse.json(membership);
  }),

  http.post("/api/e/:slug/leave", ({ params }) => {
    joined.delete(slugParam(params.slug));
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/me/privacy", () => HttpResponse.json(privacy)),
  http.put("/api/me/privacy", async ({ request }) => {
    privacy = (await request.json()) as ApiSchemas["PrivacySettings"];
    return HttpResponse.json(privacy);
  }),

  http.get("/api/events/:eventId", ({ params }) =>
    params.eventId === "event-not-found"
      ? notFound("We couldn't find that event.")
      : HttpResponse.json(demoEvent),
  ),

  http.post("/api/uploads", () =>
    HttpResponse.json<ApiSchemas["Error"]>(
      {
        code: "unavailable",
        message: "Image uploads aren't available in mock mode.",
      },
      { status: 503 },
    ),
  ),
];
