// Mock Service Worker handlers built from the API contract. They let screens be built before the backend
// lands. Each feature issue adds handlers for its endpoints; keep shapes identical to
// contract/openapi.yaml (the types below enforce it).
import { http, HttpResponse } from "msw";

import type { components } from "@/lib/api/schema";

import { MOCK_MY_EVENTS, MOCK_PUBLIC_EVENTS } from "./fixtures";
import { networkingWindowSchema } from "@/lib/event-lifecycle";
import { discoveryHandlers } from "./discovery";

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
const managedEvents = new Map<string, ApiSchemas["Event"]>();
function managedEvent(id: string) {
  let event = managedEvents.get(id);
  if (!event) {
    event = { ...demoEvent, id };
    managedEvents.set(id, event);
  }
  return event;
}

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

const demoActor: ApiSchemas["Profile"] = {
  attendee_id: "6f2c3d3c-11a1-4c4c-9d9e-000000000001",
  full_name: "Tomi Ade",
  role: "Product Engineer",
  skills: [],
  interests: [],
  links: [],
  accepting_requests: true,
  relationship: "none",
};

// Demo in-app notifications (web#16): one actionable request, one accepted, one
// read message and one organizer update. Stable ids so dedupe and resume are
// easy to eyeball. A connection request's subject_id is its request id.
let notifications: ApiSchemas["Notification"][] = [
  {
    id: "a1000000-0000-0000-0000-000000000001",
    kind: "connection_request",
    event_id: null,
    subject_id: "b1000000-0000-0000-0000-00000000000a",
    actor: demoActor,
    text: "Tomi Ade asked to connect with you.",
    read: false,
    created_at: "2026-10-16T09:30:00Z",
  },
  {
    id: "a1000000-0000-0000-0000-000000000002",
    kind: "connection_accepted",
    event_id: null,
    subject_id: "b1000000-0000-0000-0000-00000000000b",
    text: "Your connection request was accepted.",
    read: false,
    created_at: "2026-10-16T09:00:00Z",
  },
  {
    id: "a1000000-0000-0000-0000-000000000003",
    kind: "message",
    event_id: null,
    subject_id: null,
    text: "New message from a connection.",
    read: true,
    created_at: "2026-10-16T08:00:00Z",
  },
  {
    id: "a1000000-0000-0000-0000-000000000004",
    kind: "organizer_update",
    event_id: null,
    subject_id: null,
    text: "The schedule for your event was updated.",
    read: true,
    created_at: "2026-10-15T18:00:00Z",
  },
];
let preferences: ApiSchemas["NotificationPreferences"] = {
  connection_request: true,
  connection_accepted: true,
  message: true,
  organizer_update: true,
};

export const apiMockHandlers = [
  ...discoveryHandlers,
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
      : HttpResponse.json(managedEvent(slugParam(params.eventId))),
  ),
  http.put("/api/events/:eventId/networking", async ({ params, request }) => {
    const parsed = networkingWindowSchema.safeParse(await request.json());
    if (!parsed.success)
      return HttpResponse.json(
        { code: "validation", message: "Check the networking times." },
        { status: 400 },
      );
    const event = managedEvent(slugParam(params.eventId));
    event.networking_opens_at = parsed.data.opens_at;
    event.networking_closes_at = parsed.data.closes_at;
    const time = Date.now();
    event.networking_state =
      time < Date.parse(parsed.data.opens_at)
        ? "not_open"
        : time >= Date.parse(parsed.data.closes_at)
          ? "closed"
          : "open";
    event.updated_at = now();
    return HttpResponse.json(event);
  }),
  http.post("/api/events/:eventId/status", async ({ params, request }) => {
    const body = (await request.json()) as { status?: string };
    if (body.status !== "ended" && body.status !== "published")
      return HttpResponse.json(
        { code: "validation", message: "Choose a valid event status." },
        { status: 400 },
      );
    const event = managedEvent(slugParam(params.eventId));
    event.status = body.status;
    event.updated_at = now();
    return HttpResponse.json(event);
  }),

  http.get("/api/notifications", () =>
    HttpResponse.json({
      items: notifications,
      unread: notifications.filter((n) => !n.read).length,
      next_cursor: null,
    }),
  ),

  http.post("/api/notifications/read", async ({ request }) => {
    const body = (await request.json()) as { ids?: string[]; all?: boolean };
    const marked = body.all ? notifications.map((n) => n.id) : (body.ids ?? []);
    notifications = notifications.map((n) =>
      marked.includes(n.id) ? { ...n, read: true } : n,
    );
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/me/notification-preferences", () =>
    HttpResponse.json(preferences),
  ),

  http.put("/api/me/notification-preferences", async ({ request }) => {
    preferences =
      (await request.json()) as ApiSchemas["NotificationPreferences"];
    return HttpResponse.json(preferences);
  }),

  http.post("/api/connection-requests/:requestId/:action", ({ params }) => {
    const action = params.action as "accept" | "reject" | "cancel";
    const request_ = notifications.find(
      (n) =>
        n.kind === "connection_request" && n.subject_id === params.requestId,
    );
    if (!request_)
      return notFound("That connection request isn't in your notifications.");
    request_.read = true;
    return HttpResponse.json({
      id: params.requestId,
      status: action === "accept" ? "accepted" : "rejected",
      message: null,
      direction: "incoming",
      other: request_.actor,
      created_at: now(),
    } as ApiSchemas["ConnectionRequest"]);
  }),

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
