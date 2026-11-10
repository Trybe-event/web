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

// Connection requests and connections (web#14). The incoming request reuses the
// notification's subject id, so answering it from the notifications screen and
// answering it here act on the same record. Accepting mints the connection: only
// the API can issue one, which is why the page refetches GET /me/connections.
const firstMockEvent = MOCK_MY_EVENTS[0];
if (!firstMockEvent)
  throw new Error("Mock fixtures need at least one event for connections.");
const demoEventId = firstMockEvent.event.id;

const outgoingActor: ApiSchemas["Profile"] = {
  attendee_id: "6f2c3d3c-11a1-4c4c-9d9e-000000000003",
  full_name: "Ada Nwosu",
  role: "Community Lead",
  organization: "Trybe",
  skills: [],
  interests: [],
  links: [],
  accepting_requests: true,
  relationship: "pending_outgoing",
};

// A conversation exists only for an accepted connection (web#18). The demo
// inbox is built from this connected profile, so it can never show a pending
// or rejected request as a conversation.
const connectedActor: ApiSchemas["Profile"] = {
  ...demoActor,
  relationship: "connected",
};

const connectionRequests: ApiSchemas["ConnectionRequest"][] = [
  {
    id: "b1000000-0000-0000-0000-00000000000a",
    event_id: demoEventId,
    status: "pending",
    message: "Your talk on onboarding stuck with me.",
    direction: "incoming",
    other: { ...demoActor, relationship: "pending_incoming" },
    created_at: "2026-10-16T09:30:00Z",
  },
  {
    id: "d1000000-0000-0000-0000-000000000001",
    event_id: demoEventId,
    status: "pending",
    message: null,
    direction: "outgoing",
    other: outgoingActor,
    created_at: "2026-10-15T14:05:00Z",
  },
];

let connections: ApiSchemas["Connection"][] = [
  {
    id: "b1000000-0000-0000-0000-00000000000b",
    origin_event_id: demoEventId,
    connected_at: "2026-10-14T11:00:00Z",
    other: connectedActor,
  },
];

const demoConversationId = "c1000000-0000-0000-0000-000000000001";
// Any id that isn't the other participant's stands in for the viewer, because
// the thread tells its own messages apart by `sender_id !== other.attendee_id`.
const demoSelfAttendeeId = "6f2c3d3c-11a1-4c4c-9d9e-000000000002";

// Oldest first, the order the thread renders. The inbox card's last_message is
// the newest of these (web#19).
let messages: ApiSchemas["Message"][] = [
  {
    id: "m1000000-0000-0000-0000-000000000001",
    conversation_id: demoConversationId,
    sender_id: connectedActor.attendee_id,
    body: "Hey! Great meeting you at the event.",
    created_at: "2026-10-16T10:15:00Z",
  },
  {
    id: "m1000000-0000-0000-0000-000000000002",
    conversation_id: demoConversationId,
    sender_id: demoSelfAttendeeId,
    body: "You too. Your talk on onboarding stuck with me.",
    created_at: "2026-10-16T10:18:00Z",
  },
  {
    id: "m1000000-0000-0000-0000-000000000003",
    conversation_id: demoConversationId,
    sender_id: connectedActor.attendee_id,
    body: "Thanks! Want to swap notes next week?",
    created_at: "2026-10-16T10:20:00Z",
  },
];

let conversations: ApiSchemas["Conversation"][] = [
  {
    id: demoConversationId,
    connection_id: "b1000000-0000-0000-0000-00000000000b",
    other: connectedActor,
    last_message: messages[2],
    unread: 1,
    can_send: true,
  },
];

function setConversation(
  conversationId: string,
  change: Partial<ApiSchemas["Conversation"]>,
) {
  conversations = conversations.map((conversation) =>
    conversation.id === conversationId
      ? { ...conversation, ...change }
      : conversation,
  );
}

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

  // Relevance feedback (web#28). It validates the contract's ranges so a bad client
  // sees the same 400 the Go API would return.
  http.post("/api/feedback", async ({ request }) => {
    const body = (await request.json()) as {
      event_id?: string;
      relevance?: number;
      comment?: string;
    };
    const valid =
      Boolean(body.event_id) &&
      Number.isInteger(body.relevance) &&
      (body.relevance ?? 0) >= 1 &&
      (body.relevance ?? 0) <= 5 &&
      (body.comment?.length ?? 0) <= 1000;
    if (!valid)
      return HttpResponse.json<ApiSchemas["Error"]>(
        {
          code: "invalid",
          message:
            "Feedback needs an event, a relevance score from 1 to 5, and an optional comment up to 1000 characters.",
        },
        { status: 400 },
      );
    return new HttpResponse(null, { status: 201 });
  }),

  // Pending requests in one direction (web#14). The contract requires the query.
  http.get("/api/me/connection-requests", ({ request }) => {
    const direction =
      new URL(request.url).searchParams.get("direction") === "outgoing"
        ? "outgoing"
        : "incoming";
    return HttpResponse.json({
      items: connectionRequests.filter((item) => item.direction === direction),
    });
  }),

  http.get("/api/me/connections", () =>
    HttpResponse.json({ items: connections }),
  ),

  http.delete("/api/connections/:connectionId", ({ params }) => {
    const connectionId = slugParam(params.connectionId);
    const remaining = connections.filter((item) => item.id !== connectionId);
    if (remaining.length === connections.length)
      return notFound("That connection isn't yours.");
    connections = remaining;
    return new HttpResponse(null, { status: 204 });
  }),

  // Answering a request. A decided request answers 409, which is the conflict the
  // page reconciles by refetching the server's state.
  http.post("/api/connection-requests/:requestId/:action", ({ params }) => {
    const requestId = slugParam(params.requestId);
    const action = params.action as "accept" | "reject" | "cancel";
    const request_ = connectionRequests.find((item) => item.id === requestId);
    if (!request_) return notFound("That connection request isn't yours.");
    if (request_.status !== "pending")
      return HttpResponse.json<ApiSchemas["Error"]>(
        { code: "conflict", message: "This request was already answered." },
        { status: 409 },
      );
    if ((action === "cancel") !== (request_.direction === "outgoing"))
      return HttpResponse.json<ApiSchemas["Error"]>(
        {
          code: "forbidden",
          message: "That action doesn't apply to this request.",
        },
        { status: 403 },
      );

    request_.status =
      action === "accept"
        ? "accepted"
        : action === "reject"
          ? "rejected"
          : "cancelled";

    // The notification that carried the request stays in the list, already read.
    const notification = notifications.find(
      (item) => item.subject_id === requestId,
    );
    if (notification) notification.read = true;

    if (action === "accept")
      connections = [
        {
          id: crypto.randomUUID(),
          origin_event_id: request_.event_id,
          connected_at: now(),
          other: { ...request_.other, relationship: "connected" },
        },
        ...connections,
      ];

    return HttpResponse.json(request_);
  }),

  http.delete(
    "/api/blocks/:attendeeId",
    () => new HttpResponse(null, { status: 204 }),
  ),

  http.post("/api/connections/:connectionId/conversation", ({ params }) => {
    const conversation = conversations.find(
      (candidate) => candidate.connection_id === params.connectionId,
    );
    return conversation
      ? HttpResponse.json(conversation)
      : HttpResponse.json(
          { code: "forbidden", message: "You are not connected." },
          { status: 403 },
        );
  }),
  http.get("/api/conversations", () =>
    HttpResponse.json({ items: conversations }),
  ),

  // Newest first with a cursor, matching the contract (web#19).
  http.get(
    "/api/conversations/:conversationId/messages",
    ({ params, request }) => {
      const conversationId = slugParam(params.conversationId);
      if (!conversations.some((item) => item.id === conversationId))
        return notFound("That conversation isn't in your inbox.");
      const url = new URL(request.url);
      const limit = Math.min(
        100,
        Math.max(1, Number(url.searchParams.get("limit") ?? 25) || 25),
      );
      const cursor = url.searchParams.get("cursor");
      const newestFirst = [...messages].sort(
        (left, right) =>
          right.created_at.localeCompare(left.created_at) ||
          right.id.localeCompare(left.id),
      );
      const start = cursor
        ? Math.max(
            0,
            newestFirst.findIndex((message) => message.id === cursor) + 1,
          )
        : 0;
      const items = newestFirst.slice(start, start + limit);
      return HttpResponse.json({
        items,
        next_cursor:
          start + limit < newestFirst.length
            ? (items.at(-1)?.id ?? null)
            : null,
      });
    },
  ),

  http.post(
    "/api/conversations/:conversationId/messages",
    async ({ params, request }) => {
      const conversationId = slugParam(params.conversationId);
      const conversation = conversations.find(
        (item) => item.id === conversationId,
      );
      if (!conversation)
        return notFound("That conversation isn't in your inbox.");
      const body = (await request.json()) as { body?: string };
      const text = (body.body ?? "").trim();
      if (text.length < 1 || text.length > 4000)
        return HttpResponse.json<ApiSchemas["Error"]>(
          {
            code: "invalid",
            message: "Messages must be between 1 and 4000 characters.",
            fields: { body: "Write a message up to 4000 characters." },
          },
          { status: 400 },
        );
      if (!conversation.can_send)
        return HttpResponse.json<ApiSchemas["Error"]>(
          {
            code: "forbidden",
            message: "This connection is no longer accepting messages.",
          },
          { status: 403 },
        );
      const message: ApiSchemas["Message"] = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        sender_id: demoSelfAttendeeId,
        body: text,
        created_at: now(),
      };
      messages = [...messages, message];
      setConversation(conversationId, { last_message: message });
      return HttpResponse.json(message, { status: 201 });
    },
  ),

  http.post("/api/conversations/:conversationId/read", ({ params }) => {
    const conversationId = slugParam(params.conversationId);
    if (!conversations.some((item) => item.id === conversationId))
      return notFound("That conversation isn't in your inbox.");
    setConversation(conversationId, { unread: 0 });
    return new HttpResponse(null, { status: 204 });
  }),

  // Mock mode has no socket; the thread polls /messages instead.
  http.post("/api/ws/tickets", () =>
    HttpResponse.json(
      {
        ticket: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
      { status: 201 },
    ),
  ),

  // Blocking ends messaging with that person (web#19), so the composer locks.
  http.post("/api/blocks", async ({ request }) => {
    const body = (await request.json()) as { attendee_id?: string };
    conversations = conversations.map((conversation) =>
      conversation.other.attendee_id === body.attendee_id
        ? { ...conversation, can_send: false }
        : conversation,
    );
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/reports", () => new HttpResponse(null, { status: 201 })),

  // The two totals stay consistent with the lists they summarize, so the
  // badge and the inbox header can never disagree in mock mode.
  http.get("/api/me/unread", () =>
    HttpResponse.json({
      messages: conversations.reduce((sum, c) => sum + c.unread, 0),
      notifications: notifications.filter((n) => !n.read).length,
    }),
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
