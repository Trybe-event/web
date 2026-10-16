// Mock Service Worker handlers built from the API contract. They let screens be built before the backend
// lands. Each feature issue adds handlers for its endpoints; keep shapes identical to
// contract/openapi.yaml (the types below enforce it).
import { http, HttpResponse } from "msw";

import type { components } from "@/lib/api/schema";

type ApiSchemas = components["schemas"];

const now = () => new Date().toISOString();

let profile: ApiSchemas["OwnProfile"] | null = null;
let privacy: ApiSchemas["PrivacySettings"] = {
  accepting_requests: true,
  ai_matching_opt_out: false,
};

const notFound = (message: string) =>
  HttpResponse.json<ApiSchemas["Error"]>(
    { code: "not_found", message },
    { status: 404 },
  );

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
    if (!profile) return notFound("You haven't created your profile yet.");
    const as = new URL(request.url).searchParams.get("as");
    const allowed =
      as === "connection"
        ? ["connections", "event_members"]
        : ["event_members"];
    const view: ApiSchemas["Profile"] = {
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
    return HttpResponse.json(view);
  }),

  http.get("/api/me/privacy", () => HttpResponse.json(privacy)),
  http.put("/api/me/privacy", async ({ request }) => {
    privacy = (await request.json()) as ApiSchemas["PrivacySettings"];
    return HttpResponse.json(privacy);
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
